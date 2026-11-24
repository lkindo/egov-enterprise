package nuri.api.schema;

import nuri.business.core.harness.QueryCountInspector;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.TmplatInfoService;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.template.AssignableTemplate;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.AdditionalAnswers.delegatesTo;

/** Actual JPA writes on disposable PostgreSQL: creation must never merge an existing identifier. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class TemplateCreationIntegrityIntegrationTest {
    @Autowired private TmplatInfoService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private TemplateRepository repository;
    @Autowired private TemplateMapper mapper;
    private String templateId;

    @BeforeEach
    void prepareIdentity() {
        templateId = "T_" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        authenticate("TEMPLATE_CREATE");
    }

    @AfterEach
    void removeOwnFixture() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_tmplt_info WHERE tmplt_id=?", templateId);
    }

    @Test
    @Transactional
    void pickerReadsOnlyActiveIdsAndNamesAndKeepsNameThenIdOrder() {
        String prefix = templateId.substring(0, 19);
        jdbc.batchUpdate("""
                INSERT INTO tb_tmplt_info (tmplt_id, tmplt_nm, tmplt_se_cd, tmplt_path, use_yn)
                VALUES (?, ?, 'TMPT01', '/fixture', ?)
                """, List.of(
                new Object[]{prefix + "C", "한국어", "Y"},
                new Object[]{prefix + "D", "꺼짐", "N"},
                new Object[]{prefix + "E", "apple", "Y"},
                new Object[]{prefix + "B", "English", "Y"},
                new Object[]{prefix + "A", "English", "Y"}));
        authenticate("TEMPLATE_READ");

        QueryCountInspector.start();
        try {
            assertThat(service.assignableTemplates()).filteredOn(item -> item.tmpltId().startsWith(prefix))
                    .containsExactly(new AssignableTemplate(prefix + "A", "English"),
                            new AssignableTemplate(prefix + "B", "English"), new AssignableTemplate(prefix + "E", "apple"),
                            new AssignableTemplate(prefix + "C", "한국어"));
            assertThat(QueryCountInspector.getQueries()).filteredOn(sql -> sql.contains("tb_tmplt_info"))
                    .singleElement().satisfies(query -> {
                        String sql = query.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
                        String projection = sql.substring(sql.indexOf("select ") + 7, sql.indexOf(" from "));
                        assertThat(projection.split(",")).hasSize(2);
                        assertThat(projection).contains("tmplt_id", "tmplt_nm");
                        assertThat(sql).containsPattern("\\bwhere\\b.*\\buse_yn\\b");
                    });
        } finally {
            QueryCountInspector.clear();
        }
    }

    @Test
    void creatingAnExistingIdRejectsWithoutChangingContentOrAudit() {
        service.insertTmplatInfo(template("original"));
        var original = jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId);

        assertThatThrownBy(() -> service.insertTmplatInfo(template("replacement")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);

        assertThat(jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId))
                .isEqualTo(original);
    }

    @Test
    void staleAbsenceCheckStillCannotMergeAnExistingTemplate() {
        service.insertTmplatInfo(template("original"));
        var original = jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId);
        // Model another transaction committing after the absence check; JPA and the DB remain real.
        var staleRepository = mock(TemplateRepository.class, delegatesTo(repository));
        doReturn(false).when(staleRepository).existsById(templateId);
        var staleCreator = new TmplatInfoService(staleRepository, mapper, List.of());

        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(
                status -> staleCreator.insertTmplatInfo(template("replacement"))))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThat(jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId))
                .isEqualTo(original);
    }

    @Test
    void concurrentCreationCommitsExactlyOneTemplateWithoutReplacingTheWinner() throws Exception {
        var inserted = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                authenticate("TEMPLATE_CREATE");
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        service.insertTmplatInfo(template("winner"));
                        repository.flush();
                        inserted.countDown();
                        await(release);
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                boolean ready = inserted.await(15, TimeUnit.SECONDS);
                if (!ready && first.isDone()) first.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("선행 INSERT가 DB에 반영되어야 한다").isTrue();
                var second = executor.submit(() -> {
                    authenticate("TEMPLATE_CREATE");
                    try {
                        assertThatThrownBy(() -> new TransactionTemplate(transactionManager)
                                .executeWithoutResult(status -> {
                                    VendorTestSql.nameSession(jdbc, "template-create-contender");
                                    service.insertTmplatInfo(template("loser"));
                                })).isInstanceOf(DataIntegrityViolationException.class);
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                try {
                    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                    int waiting;
                    do {
                        waiting = VendorTestSql.waitingSessions(jdbc, "template-create-contender");
                        if (waiting == 0) Thread.sleep(20);
                    } while (waiting == 0 && System.nanoTime() < deadline);
                    assertThat(waiting).as("실제 INSERT의 PK 경합").isEqualTo(1);
                } finally {
                    release.countDown();
                }
                first.get(20, TimeUnit.SECONDS);
                second.get(20, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
        }
        assertThat(jdbc.queryForList("SELECT tmplt_nm FROM tb_tmplt_info WHERE tmplt_id=?", String.class, templateId))
                .containsExactly("winner");
    }

    @Test
    void updatingTemplateReturnsIncrementedVersionForConsecutiveSave() {
        service.insertTmplatInfo(template("initial"));
        authenticate("TEMPLATE_UPDATE");

        TemplateDto first = service.updateTmplatInfo(templateId, TemplateDto.builder()
                .tmpltNm("first update").tmpltSeCd("TMPT01").tmpltPath("/first").useYn("Y").version(0).build());
        assertThat(first.getVersion()).isEqualTo(1);

        TemplateDto second = service.updateTmplatInfo(templateId, TemplateDto.builder()
                .tmpltNm("second update").tmpltSeCd("TMPT01").tmpltPath("/second").useYn("Y")
                .version(first.getVersion()).build());
        assertThat(second.getVersion()).isEqualTo(2);
        assertThat(jdbc.queryForMap("SELECT tmplt_nm, version FROM tb_tmplt_info WHERE tmplt_id=?", templateId))
                .containsEntry("tmplt_nm", "second update")
                .containsEntry("version", 2);
    }

    private TemplateDto template(String name) {
        return TemplateDto.builder().tmpltId(templateId).tmpltNm(name).tmpltSeCd("TMPT01")
                .tmpltPath("/" + name).useYn("Y").build();
    }

    private static void authenticate(String permission) {
        var principal = CustomUserDetails.builder().userId("template-creator").esntlId("TEMPLATE_CREATOR")
                .enabled(true).permissions(List.of(permission)).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(25, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }
}
