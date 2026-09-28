package nuri.api.schema;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.service.file.FileDeletionWorkHandler;
import nuri.business.service.file.FileService;
import nuri.business.service.system.job.DurableWorkDispatcher;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Actual storage plus PostgreSQL prove that row removal and its intent share a commit boundary. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class FileDeletionDurabilityIntegrationTest {
    @TempDir static Path storageRoot;
    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry properties) {
        properties.add("file.upload.path", () -> storageRoot.toString());
    }
    @Autowired private FileService files;
    @Autowired private FileDetailRepository details;
    @Autowired private DurableJobRepository jobs;
    @Autowired private FileDeletionWorkHandler handler;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private JdbcTemplate jdbc;
    private Long master;
    private FileDetail detail;
    private Path physical;
    private UUID committedAliasId;
    private Path committedAliasAnchor;

    @BeforeEach
    void uploadActualFixture() throws Exception {
        String actor = "FD" + UUID.randomUUID().toString().substring(0, 8);
        var principal = CustomUserDetails.builder().userId(actor).esntlId(actor).enabled(true).lockAt("N")
                .groups(List.of()).permissions(List.of()).authorizationVersion("file-fixture").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        master = files.uploadFiles(List.of(new MockMultipartFile("files", "fixture.txt", "text/plain", "durable fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        detail = details.findByFileMasterAtchFileSnAndAtchFileSeq(master, 1).orElseThrow();
        physical = storageRoot.resolve(detail.getFileStrgPath()).resolve(detail.getStrgFileNm());
        assertThat(physical).hasContent("durable fixture");
    }

    @AfterEach
    void cleanupOwnFixtures() throws Exception {
        jdbc.execute("DROP TRIGGER IF EXISTS tr_test_file_intent_failure ON tb_sys_job");
        jdbc.execute("DROP FUNCTION IF EXISTS test_file_intent_failure()");
        SecurityContextHolder.clearContext();
        if (detail != null) jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", detail.getId().toString());
        if (committedAliasId != null) jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", committedAliasId.toString());
        if (committedAliasAnchor != null) {
            assertThat(committedAliasAnchor.normalize().startsWith(storageRoot.resolve(".deletions"))).isTrue();
            Files.deleteIfExists(committedAliasAnchor);
        }
        if (master != null) {
            jdbc.update("DELETE FROM tb_file_detail WHERE atch_file_sn=?", master);
            jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn=?", master);
        }
    }

    @Test
    void rollbackPreservesMetadataAndFileAndDiscardsIntentPreparation() {
        Path rolledBackAnchor = new TransactionTemplate(manager).execute(status -> {
            deleteFixture();
            assertThat(jobs.findByJobMngNo(detail.getId().toString())).isPresent();
            Path preparation = intentAnchor(detail.getId());
            assertThat(preparation).exists();
            status.setRollbackOnly();
            return preparation;
        });
        assertThat(details.findById(detail.getId())).isPresent();
        assertThat(jobs.findByJobMngNo(detail.getId().toString())).isEmpty();
        assertThat(physical).hasContent("durable fixture");
        assertThat(rolledBackAnchor).doesNotExist();
    }

    @Test
    void rollbackRemovesOnlyItsPreparationAndKeepsCommittedCaptureOfSameFile() throws Exception {
        // An existing storage object may be referenced by more than one metadata row.
        // Both deletion captures must own different anchors even for the same physical object.
        var alias = details.saveAndFlush(FileDetail.builder()
                .fileMaster(detail.getFileMaster()).atchFileSeq(2)
                .fileStrgPath(detail.getFileStrgPath()).strgFileNm(detail.getStrgFileNm())
                .orgnlFileNm(detail.getOrgnlFileNm()).fileEstn(detail.getFileEstn()).fileSz(detail.getFileSz())
                .build());
        committedAliasId = alias.getId();
        files.deleteFile(master, 2);
        assertThat(details.findById(committedAliasId)).isEmpty();
        var committedWork = jobs.findByJobMngNo(committedAliasId.toString()).orElseThrow().work();
        committedAliasAnchor = intentAnchor(committedAliasId);
        assertThat(committedAliasAnchor).exists();
        assertThat(Files.isSameFile(committedAliasAnchor, physical)).isTrue();

        Path rolledBackAnchor = new TransactionTemplate(manager).execute(status -> {
            deleteFixture();
            Path preparation = intentAnchor(detail.getId());
            assertThat(preparation).exists().isNotEqualTo(committedAliasAnchor);
            status.setRollbackOnly();
            return preparation;
        });

        assertThat(rolledBackAnchor).doesNotExist();
        assertThat(committedAliasAnchor).exists();
        assertThat(Files.isSameFile(committedAliasAnchor, physical)).isTrue();
        assertThat(physical).hasContent("durable fixture");
        assertThat(details.findById(detail.getId())).isPresent();
        assertThat(jobs.findByJobMngNo(detail.getId().toString())).isEmpty();
        assertThat(jobs.findByJobMngNo(committedAliasId.toString()).orElseThrow().work()).isEqualTo(committedWork);
        // Delivery also refuses to remove a captured object while the surviving row references it.
        assertThatThrownBy(() -> handler.execute(committedWork))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
        assertThat(committedAliasAnchor).exists();
        assertThat(physical).exists();
    }

    @Test
    void intentInsertFailureRollsBackTheActualMetadataDelete() {
        // Failure is injected at the physical intent INSERT, not in a mock repository.
        jdbc.execute("CREATE FUNCTION test_file_intent_failure() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN IF NEW.job_se_nm = 'FILE_DELETE' THEN RAISE EXCEPTION 'fixture intent write failure'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER tr_test_file_intent_failure BEFORE INSERT ON tb_sys_job "
                + "FOR EACH ROW EXECUTE FUNCTION test_file_intent_failure()");
        assertThatThrownBy(this::deleteFixture).isInstanceOf(RuntimeException.class);
        assertThat(details.findById(detail.getId())).isPresent();
        assertThat(jobs.findByJobMngNo(detail.getId().toString())).isEmpty();
        assertThat(physical).hasContent("durable fixture");
    }

    @Test
    void newWorkerAfterCommitDeletesOriginalAndAcknowledgesTheDurableIntent() {
        deleteFixture();
        assertThat(details.findById(detail.getId())).isEmpty();
        assertThat(jobs.findByJobMngNo(detail.getId().toString())).isPresent();
        assertThat(physical).exists();
        var restarted = new DurableWorkDispatcher(jobs, List.of(handler), manager, false);
        assertThat(restarted.dispatchOne()).isTrue();
        assertThat(physical).doesNotExist();
        assertThat(jobs.findByJobMngNo(detail.getId().toString()).orElseThrow().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(restarted.dispatchOne()).isFalse();
    }

    @Test
    void replacementAtTheSamePathSurvivesDelayedDelivery() throws Exception {
        deleteFixture();
        Path replacement = physical.resolveSibling("replacement.txt");
        Files.writeString(replacement, "replacement contents");
        Files.move(replacement, physical, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        new DurableWorkDispatcher(jobs, List.of(handler), manager, false).dispatchOne();
        assertThat(physical).hasContent("replacement contents");
        assertThat(jobs.findByJobMngNo(detail.getId().toString()).orElseThrow().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    private void deleteFixture() {
        try { files.deleteFile(master, 1); }
        catch (java.io.IOException failure) { throw new java.io.UncheckedIOException(failure); }
    }

    private Path intentAnchor(UUID key) {
        String identity = jdbc.queryForObject("SELECT job_cn::jsonb->>'identity' FROM tb_sys_job WHERE job_mng_no=?",
                String.class, key.toString());
        assertThat(identity).matches("[0-9a-f-]{36}:[0-9a-f]{64}");
        return storageRoot.resolve(".deletions").resolve(identity.substring(0, 36) + ".anchor");
    }
}
