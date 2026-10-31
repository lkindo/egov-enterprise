package nuri.api.schema;

import nuri.business.service.memoreport.MemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileAccessPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.file.dto.FileDto;
import nuri.business.service.memoreport.dto.MemoReportMapper;
import nuri.foundation.core.job.DurableWorkPort;
import nuri.foundation.core.storage.FileStorageService;
import nuri.foundation.core.user.UserDisplayNameLookup;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.ClassUtils;

import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 메모 선택 모듈 안에서 수신자·최초 열람과 읽은 본문/첨부 CAS의 실제 PostgreSQL 경합을 검증한다. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@RecordApplicationEvents
class MemoReportRecipientIntegrityIntegrationTest {
    @TempDir static Path storageRoot;
    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry properties) {
        properties.add("file.upload.path", () -> storageRoot.toString());
    }

    @Autowired private MemoReportService memoReportService;
    @Autowired private javax.sql.DataSource dataSource;
    @Autowired private jakarta.persistence.EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private ApplicationContext applicationContext;
    @Autowired private ApplicationEvents applicationEvents;
    @Autowired private FileService files;
    @Autowired private FileDetailRepository details;
    @Autowired private FileMasterRepository masters;
    @Autowired private FileStorageService storageService;
    @Autowired private FileAccessPolicy fileAccessPolicy;
    @Autowired private DurableWorkPort durableWork;
    @Autowired private tools.jackson.databind.ObjectMapper objectMapper;
    @Autowired private MemoReportRepository reports;
    @Autowired private UserRepository users;
    @Autowired private MemoReportMapper mapper;
    @Autowired private UserDisplayNameLookup names;
    @Autowired private AttachmentAssignmentPolicy assignment;
    @Autowired private org.springframework.context.ApplicationEventPublisher publisher;

    private String fixtureId;
    private String sender;
    private String active;
    private String waiting;
    private String disabled;
    private String missing;
    private boolean notificationModule;
    private final List<Long> attachmentGroups = new ArrayList<>();
    private final List<String> deletedFileIds = new ArrayList<>();

    @BeforeEach
    void seedOnlyDisposableDatabaseUsers() {
        fixtureId = "MR" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        sender = fixtureId + "S";
        active = fixtureId + "P";
        waiting = fixtureId + "A";
        disabled = fixtureId + "D";
        missing = fixtureId + "M";
        insertUser(sender, "P");
        insertUser(active, "P");
        insertUser(waiting, "A");
        insertUser(disabled, "D");
        authenticate(sender);
        assertThat(AopUtils.isAopProxy(memoReportService)).isTrue();
        // 알림은 선택 모듈이다. 실제 클래스가 포함됐으면 bean과 테이블이 반드시 있어야 한다.
        // 테이블 누락을 '알림 없음'으로 처리하거나 선택 도메인에 Java import를 강요하지 않는다.
        notificationModule = ClassUtils.isPresent("nuri.business.service.notification.NotificationService", getClass().getClassLoader());
        if (notificationModule) {
            var notificationType = ClassUtils.resolveClassName("nuri.business.service.notification.NotificationService", getClass().getClassLoader());
            assertThat(applicationContext.getBeansOfType(notificationType)).hasSize(1);
            assertThat(jdbc.queryForObject("SELECT to_regclass('public.tb_user_noti') IS NOT NULL", Boolean.class)).isTrue();
        }
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver' IN (?, ?, ?, ?, ?)",
                sender, active, waiting, disabled, missing);
        if (notificationModule) {
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)", sender, active, waiting, disabled, missing);
        }
        jdbc.update("DELETE FROM tb_memo_rpt_info WHERE user_id=?", sender);
        for (Long group : attachmentGroups) {
            jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no IN "
                    + "(SELECT file_detail_id::text FROM tb_file_detail WHERE atch_file_sn=?)", group);
            jdbc.update("DELETE FROM tb_file_detail WHERE atch_file_sn=?", group);
            jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn=?", group);
        }
        for (String fileId : deletedFileIds) {
            jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?", fileId);
        }
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?, ?, ?, ?)", sender, active, waiting, disabled);
    }

    private void insertUser(String id, String state) {
        jdbc.update("INSERT INTO tb_user_info(esntl_id, user_id, pswd, user_nm, user_stts_cd, lck_yn, sbscrb_ymd) "
                + "VALUES (?, ?, 'test-only-unusable', '시험 계정', ?, 'N', to_char(CURRENT_DATE, 'YYYYMMDD'))",
                id, login(id), state);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "A", "D"})
    void unavailableMemoRecipientLeavesNoReportOrNotification(String state) throws InterruptedException {
        assertThatThrownBy(() -> memoReportService.createMemoReport(sender, memo(unavailable(state))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_memo_rpt_info WHERE user_id=?", Long.class, sender)).isZero();
        assertThat(applicationEvents.stream(NotificationRequestedEvent.class).count()).isZero();
        if (notificationModule) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)",
                    Long.class, sender, active, waiting, disabled, missing)).isZero();
        }
    }

    @Test
    void memoRecipientIsFixedAndInactiveExistingRecipientDoesNotBlockCorrection() {
        long id = memoReportService.createMemoReport(sender, memo(active));
        jdbc.update("UPDATE tb_user_info SET user_stts_cd='D' WHERE esntl_id=?", active);
        var correction = memo(active);
        correction.setRptCn("corrected");
        memoReportService.updateMemoReport(id, sender, correction);
        assertThatThrownBy(() -> memoReportService.updateMemoReport(id, sender, memo(sender)))
                .isInstanceOf(BusinessException.class);
        assertThat(jdbc.queryForMap("SELECT rptr_id, rpt_cn FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", id))
                .containsEntry("rptr_id", active).containsEntry("rpt_cn", "corrected");
    }

    @Test
    void memoRegistrationWaitsForConcurrentDeactivationAndRejectsItsCommittedState() throws Exception {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        try (var blocker = dataSource.getConnection(); var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            try (var update = blocker.prepareStatement("UPDATE tb_user_info SET user_stts_cd='D' WHERE esntl_id=?")) {
                update.setString(1, active);
                update.executeUpdate();
            }
            String application = fixtureId + "memo";
            var pending = executor.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(authentication);
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        return memoReportService.createMemoReport(sender, memo(active));
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                waitForDatabaseLock(application, 1);
            } finally {
                blocker.commit();
            }
            assertThatThrownBy(() -> pending.get(20, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(BusinessException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_memo_rpt_info WHERE user_id=?", Long.class, sender)).isZero();
        }
    }

    @Test
    void concurrentRecipientReadsPreserveExactlyTheFirstReadTime() throws Exception {
        assertThat(jdbc.queryForObject("SELECT datetime_precision FROM information_schema.columns "
                + "WHERE table_schema=current_schema() AND table_name='tb_memo_rpt_info' AND column_name='rptr_inq_dt'",
                Integer.class)).isEqualTo(6);
        long id = memoReportService.createMemoReport(sender, memo(active));
        // 작성자가 확인해도 수신자 읽음은 생기지 않는다.
        memoReportService.getMemoReport(id);
        assertThat(jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", java.sql.Timestamp.class, id)).isNull();
        try (var blocker = dataSource.getConnection(); var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT memo_rpt_sn FROM tb_memo_rpt_info WHERE memo_rpt_sn=? FOR UPDATE")) {
                lock.setLong(1, id);
                lock.executeQuery().close();
            }
            String application = fixtureId + "read";
            java.util.concurrent.Callable<java.sql.Timestamp> read = () -> {
                authenticate(active);
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        MemoReportDto response = memoReportService.getMemoReport(id);
                        assertThat(response.getRptrInqDt()).isNotNull();
                        assertThat(response.getInstructionReadToken()).matches("[a-f0-9]{64}");
                        entityManager.flush();
                        java.sql.Timestamp stored = jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?",
                                java.sql.Timestamp.class, id);
                        assertThat(stored).isNotNull();
                        assertThat(response.getRptrInqDt()).isEqualTo(stored.toLocalDateTime());
                        return stored;
                    });
                } finally { SecurityContextHolder.clearContext(); }
            };
            var first = executor.submit(read);
            var second = executor.submit(read);
            try { waitForDatabaseLock(application, 2); } finally { blocker.rollback(); }
            var firstRead = first.get(20, TimeUnit.SECONDS);
            assertThat(firstRead).isNotNull().isEqualTo(second.get(20, TimeUnit.SECONDS));
            assertThat(jdbc.queryForObject("SELECT rptr_inq_dt FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", java.sql.Timestamp.class, id))
                    .isEqualTo(firstRead);
        }
    }

    @Test
    void deletionWaitsForInstructionAndPreservesTheCommittedReport() throws Exception {
        long id = memoReportService.createMemoReport(sender, memo(active));
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        authenticate(sender);
        var instructionReady = new java.util.concurrent.CountDownLatch(1);
        var releaseInstruction = new java.util.concurrent.CountDownLatch(1);
        var senderAuthentication = SecurityContextHolder.getContext().getAuthentication();
        String application = fixtureId + "delete";
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var instruction = executor.submit(() -> {
                authenticate(active);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        memoReportService.updateDrctMatter(id, "committed instruction", token);
                        entityManager.flush();
                        instructionReady.countDown();
                        try {
                            assertThat(releaseInstruction.await(25, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(interrupted);
                        }
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                assertThat(instructionReady.await(15, TimeUnit.SECONDS)).isTrue();
                var deletion = executor.submit(() -> {
                    SecurityContextHolder.getContext().setAuthentication(senderAuthentication);
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            memoReportService.deleteMemoReport(id);
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        return rejected.getErrorCode();
                    } finally { SecurityContextHolder.clearContext(); }
                });
                try { waitForDatabaseLock(application, 1); }
                finally { releaseInstruction.countDown(); }
                instruction.get(20, TimeUnit.SECONDS);
                assertThat(deletion.get(20, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                assertThat(jdbc.queryForObject("SELECT drctn_mttr FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", String.class, id))
                        .isEqualTo("committed instruction");
            } finally { releaseInstruction.countDown(); }
        }
    }

    @Test
    void unchangedSnapshotKeepsFirstReadAndPermitsInstructionReplacement() {
        long id = memoReportService.createMemoReport(sender, memo(active));
        assertThat(reportRow(id).get("rptr_inq_dt")).isNull();
        authenticate(active);
        MemoReportDto first = memoReportService.getMemoReport(id);
        Object readAt = reportRow(id).get("rptr_inq_dt");
        assertThat(readAt).isNotNull();
        assertThat(first.getInstructionReadToken()).matches("[a-f0-9]{64}");
        assertThat(memoReportService.getMemoReport(id).getInstructionReadToken())
                .isEqualTo(first.getInstructionReadToken());
        memoReportService.updateDrctMatter(id, "first instruction", first.getInstructionReadToken());
        MemoReportDto instructed = memoReportService.getMemoReport(id);
        assertThat(instructed.getInstructionReadToken()).isEqualTo(first.getInstructionReadToken());
        memoReportService.updateDrctMatter(id, "replacement instruction", first.getInstructionReadToken());
        assertThat(reportRow(id)).containsEntry("rptr_inq_dt", readAt)
                .containsEntry("drctn_mttr", "replacement instruction");
        authenticate(sender);
        assertThatThrownBy(() -> memoReportService.updateMemoReport(id, sender, memo(active)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"body", "title", "date", "attach", "detach"})
    void committedBodyOrGroupChangeRejectsPreviouslyReadTokenWithoutSideEffects(String change) throws Exception {
        long group = upload();
        MemoReportDto original = memo(active);
        if (change.equals("detach")) original.setAtchFileSn(group);
        long id = memoReportService.createMemoReport(sender, original);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        authenticate(sender);
        MemoReportDto correction = memo(active);
        switch (change) {
            case "body" -> correction.setRptCn("body B");
            case "title" -> correction.setRptTtl("title B");
            case "date" -> correction.setMemoRptYmd("20261030");
            case "attach" -> correction.setAtchFileSn(group);
            case "detach" -> correction.setAtchFileSn(null);
            default -> throw new IllegalArgumentException(change);
        }
        memoReportService.updateMemoReport(id, sender, correction);
        authenticate(active);
        assertStaleWithoutSideEffects(id, token);
        MemoReportDto current = memoReportService.getMemoReport(id);
        assertThat(current.getInstructionReadToken()).isNotEqualTo(token);
        memoReportService.updateDrctMatter(id, "read corrected content", current.getInstructionReadToken());
        assertThat(reportRow(id)).containsEntry("drctn_mttr", "read corrected content");
    }

    @Test
    void authorCannotDeleteAMemoAttachmentThroughTheFileApiBeforeOrAfterInstruction() throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(sender);
        assertThatThrownBy(() -> files.deleteFile(group, 1))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(fileCount(group)).isEqualTo(1);
        assertThat(memoReportService.getMemoReport(id).getAtchFileSn()).isEqualTo(group);
    }

    @ParameterizedTest
    @ValueSource(strings = {"append", "delete", "reuse"})
    void sameGroupMutationIncludingIdenticalNameSizeAndReusedSequenceInvalidatesToken(String mutation) throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        String originalFileId = details.findByFileMasterAtchFileSnAndAtchFileSeq(group, 1).orElseThrow().getId().toString();
        authenticate(active);
        MemoReportDto read = memoReportService.getMemoReport(id);
        assertThat(read.getAttachments()).extracting(FileDto::getFileSn).containsExactly(1);
        authenticate(sender);
        mutate(group, mutation);
        authenticate(active);
        assertStaleWithoutSideEffects(id, read.getInstructionReadToken());
        MemoReportDto current = memoReportService.getMemoReport(id);
        assertThat(current.getAtchFileSn()).isEqualTo(group);
        if (mutation.equals("delete")) {
            assertThat(current.getAttachments()).isEmpty();
        } else if (mutation.equals("reuse")) {
            assertThat(current.getAttachments()).extracting(FileDto::getFileSn).containsExactly(1);
            assertThat(current.getAttachments().getFirst().getOrignlFileNm()).isEqualTo("fixture.txt");
            assertThat(current.getAttachments().getFirst().getFileMg()).isEqualTo(read.getAttachments().getFirst().getFileMg());
            assertThat(details.findByFileMasterAtchFileSnAndAtchFileSeq(group, 1).orElseThrow().getId().toString())
                    .isNotEqualTo(originalFileId);
        } else {
            assertThat(current.getAttachments()).extracting(FileDto::getFileSn).containsExactlyInAnyOrder(1, 2);
        }
        assertThat(current.getInstructionReadToken()).isNotEqualTo(read.getInstructionReadToken());
    }

    @ParameterizedTest
    @ValueSource(strings = {"author", "administrator", "outsider"})
    void nonRecipientsCannotUseEvenAValidTokenAndAdministratorCannotReadPrivateAttachments(String actor) throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        Map<String, Object> before = reportRow(id);
        List<Long> effects = effectCounts();
        if (actor.equals("administrator")) {
            authenticate(waiting, "MEMO_RPT_READ_ALL", "MEMO_RPT_UPDATE_ALL", "MEMO_RPT_INSTRUCT", "FILE_READ_ALL", "FILE_DELETE_ALL");
            MemoReportDto adminRead = memoReportService.getMemoReport(id);
            assertThat(adminRead.getRptCn()).isEqualTo("original");
            assertThat(adminRead.getInstructable()).isFalse();
            assertThat(adminRead.getInstructionReadToken()).isNull();
            assertThat(adminRead.getAttachments()).isNullOrEmpty();
            assertThatThrownBy(() -> files.getFileList(group))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            assertThatThrownBy(() -> files.deleteFile(group, 1))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        } else {
            authenticate(actor.equals("author") ? sender : waiting);
            if (actor.equals("outsider")) {
                assertThatThrownBy(() -> memoReportService.getMemoReport(id))
                        .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            } else {
                assertThat(memoReportService.getMemoReport(id).getInstructionReadToken()).isNull();
            }
        }
        assertThatThrownBy(() -> memoReportService.updateDrctMatter(id, "forbidden instruction", token))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(reportRow(id)).isEqualTo(before);
        assertThat(effectCounts()).isEqualTo(effects);
        assertThat(fileCount(group)).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"append", "delete"})
    void mutationCommitsBeforeWaitingInstructionWhichThenRejectsOldSnapshot(String mutation) throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        var ready = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var blockerPid = new AtomicInteger();
        String application = fixtureId + "cas";
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<?> writer = executor.submit(() -> {
                authenticate(sender);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        blockerPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        mutate(group, mutation);
                        entityManager.flush();
                        ready.countDown();
                        await(release);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            Future<CommonErrorCode> instruction;
            try {
                awaitReady(ready, writer);
                instruction = executor.submit(() -> {
                    authenticate(active);
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            memoReportService.updateDrctMatter(id, "must reject", token);
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                        return CommonErrorCode.CONCURRENT_MODIFICATION;
                    } finally { SecurityContextHolder.clearContext(); }
                });
                waitForBlockingPid(application, blockerPid.get(), "tb_file_master", instruction);
            } finally { release.countDown(); }
            writer.get(20, TimeUnit.SECONDS);
            List<Long> effectsAfterMutation = effectCounts();
            assertThat(instruction.get(20, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
            assertThat(reportRow(id).get("drctn_mttr")).isNull();
            assertThat(effectCounts()).isEqualTo(effectsAfterMutation);
            assertThat(fileCount(group)).isEqualTo(mutation.equals("append") ? 2 : 0);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"append", "delete"})
    void instructionCommitsAtReadSnapshotBeforeWaitingFileMutation(String mutation) throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        var ready = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var blockerPid = new AtomicInteger();
        String application = fixtureId + "file";
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<?> instruction = executor.submit(() -> {
                authenticate(active);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        blockerPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        memoReportService.updateDrctMatter(id, "committed at read snapshot", token);
                        entityManager.flush();
                        ready.countDown();
                        await(release);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            Future<?> writer;
            try {
                awaitReady(ready, instruction);
                writer = executor.submit(() -> {
                    authenticate(sender);
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            mutate(group, mutation);
                        });
                    } finally { SecurityContextHolder.clearContext(); }
                });
                waitForBlockingPid(application, blockerPid.get(), "tb_file_master", writer);
                assertThat(fileCount(group)).isEqualTo(1);
            } finally { release.countDown(); }
            instruction.get(20, TimeUnit.SECONDS);
            writer.get(20, TimeUnit.SECONDS);
            assertThat(reportRow(id)).containsEntry("drctn_mttr", "committed at read snapshot");
            assertThat(fileCount(group)).isEqualTo(mutation.equals("append") ? 2 : 0);
            authenticate(active);
            assertStaleWithoutSideEffects(id, token);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"append", "delete"})
    void detailUsesOneAttachmentQueryWithoutMasterLockDuringInterveningCommit(String mutation) throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        MemoReportDto before = memoReportService.getMemoReport(id);
        var queried = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var reads = new AtomicInteger();
        // Only a rendezvous wraps the real repository. SQL, policies, entities and transaction are production objects.
        FileDetailRepository intercepted = (FileDetailRepository) java.lang.reflect.Proxy.newProxyInstance(
                FileDetailRepository.class.getClassLoader(), new Class<?>[]{FileDetailRepository.class}, (proxy, method, args) -> {
                    Object result;
                    try { result = method.invoke(details, args); }
                    catch (java.lang.reflect.InvocationTargetException failure) { throw failure.getCause(); }
                    if (method.getName().equals("findByFileMaster")) {
                        reads.incrementAndGet();
                        queried.countDown();
                        await(release);
                    }
                    return result;
                });
        FileService observedFiles = new FileService(masters, intercepted, storageService, fileAccessPolicy, durableWork, objectMapper);
        MemoReportService observedMemo = new MemoReportService(reports, users, mapper, names, assignment, observedFiles, publisher);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<MemoReportDto> reading = executor.submit(() -> {
                authenticate(active);
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> observedMemo.getMemoReport(id));
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                awaitReady(queried, reading);
                Future<?> mutationCommitted = executor.submit(() -> {
                    authenticate(sender);
                    try { mutate(group, mutation); }
                    finally { SecurityContextHolder.clearContext(); }
                });
                // Finishes while GET still holds its memo lock: a parent FOR UPDATE in GET would block this writer.
                mutationCommitted.get(15, TimeUnit.SECONDS);
                assertThat(fileCount(group)).isEqualTo(mutation.equals("append") ? 2 : 0);
                assertThat(reading.isDone()).isFalse();
            } finally { release.countDown(); }
            MemoReportDto response = reading.get(20, TimeUnit.SECONDS);
            assertThat(reads.get()).isEqualTo(1);
            assertThat(response.getAttachments()).usingRecursiveComparison().isEqualTo(before.getAttachments());
            assertThat(response.getInstructionReadToken()).isEqualTo(before.getInstructionReadToken());
            authenticate(active);
            assertStaleWithoutSideEffects(id, response.getInstructionReadToken());
        }
    }

    @Test
    void rolledBackInstructionKeepsReportNotificationsAndAttachmentUnchanged() throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        Map<String, Object> before = reportRow(id);
        List<Long> effects = effectCounts();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            memoReportService.updateDrctMatter(id, "rolled back instruction", token);
            entityManager.flush();
            assertThat(reportRow(id)).containsEntry("drctn_mttr", "rolled back instruction");
            status.setRollbackOnly();
        });
        assertThat(reportRow(id)).isEqualTo(before);
        assertThat(effectCounts()).isEqualTo(effects);
        assertThat(fileCount(group)).isEqualTo(1);
        assertThat(files.getFileResource(group, 1).getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .isEqualTo("durable fixture");
        memoReportService.updateDrctMatter(id, "retry after rollback", token);
        assertThat(reportRow(id)).containsEntry("drctn_mttr", "retry after rollback");
    }

    @Test
    void missingFileReadPermissionHidesInlineSnapshotAndRevocationRejectsPreviouslyIssuedToken() throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active, "MEMO_RPT_INSTRUCT");
        MemoReportDto bodyOnly = memoReportService.getMemoReport(id);
        assertThat(bodyOnly.getRptCn()).isEqualTo("original");
        assertThat(bodyOnly.getAttachments()).isNull();
        assertThat(bodyOnly.getInstructionReadToken()).isNull();
        assertThat(bodyOnly.getInstructable()).isFalse();
        Object firstRead = reportRow(id).get("rptr_inq_dt");
        assertThat(firstRead).isNotNull();
        authenticate(active);
        MemoReportDto allowed = memoReportService.getMemoReport(id);
        assertThat(allowed.getAttachments()).hasSize(1);
        assertThat(allowed.getInstructionReadToken()).isNotBlank();
        assertThat(allowed.getInstructable()).isTrue();
        authenticate(active, "MEMO_RPT_INSTRUCT");
        MemoReportDto revoked = memoReportService.getMemoReport(id);
        assertThat(revoked.getRptCn()).isEqualTo("original");
        assertThat(revoked.getAttachments()).isNull();
        assertThat(revoked.getInstructionReadToken()).isNull();
        assertThat(revoked.getInstructable()).isFalse();
        Map<String, Object> before = reportRow(id);
        List<Long> effects = effectCounts();
        assertThatThrownBy(() -> memoReportService.updateDrctMatter(id, "permission was revoked", allowed.getInstructionReadToken()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(reportRow(id)).isEqualTo(before).containsEntry("rptr_inq_dt", firstRead);
        assertThat(effectCounts()).isEqualTo(effects);
        assertThat(fileCount(group)).isEqualTo(1);
    }

    @Test
    void sharedMemoReferencePreventsTheCoreDiscardUsedByCmsReleaseWithoutLosingFilesOrJobs() throws Exception {
        long group = upload();
        long id = attachedMemo(group);
        authenticate(active);
        String token = memoReportService.getMemoReport(id).getInstructionReadToken();
        Map<String, Object> before = reportRow(id);
        List<Long> effects = effectCounts();
        authenticate(sender);
        // CMS release calls this same core path after removing its own reference. The memo reference remains real.
        assertThat(files.discardUnreferencedAttachment(group)).isFalse();
        assertThat(reportRow(id)).isEqualTo(before);
        assertThat(fileCount(group)).isEqualTo(1);
        assertThat(effectCounts()).isEqualTo(effects);
        String fileId = details.findByFileMasterAtchFileSnAndAtchFileSeq(group, 1).orElseThrow().getId().toString();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?",
                Long.class, fileId)).isZero();
        assertThat(files.getFileResource(group, 1).getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("durable fixture");
        authenticate(active);
        memoReportService.updateDrctMatter(id, "reference retained", token);
    }

    @Test
    void detailWaitsForBodyWriterAndReturnsTheBodyAndTokenFromItsCommittedVersion() throws Exception {
        long id = memoReportService.createMemoReport(sender, memo(active));
        var ready = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var blockerPid = new AtomicInteger();
        String application = fixtureId + "get";
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<?> writer = executor.submit(() -> {
                authenticate(sender);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        blockerPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        MemoReportDto changed = memo(active);
                        changed.setRptCn("committed body B");
                        memoReportService.updateMemoReport(id, sender, changed);
                        entityManager.flush();
                        ready.countDown();
                        await(release);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            Future<MemoReportDto> reader;
            try {
                awaitReady(ready, writer);
                reader = executor.submit(() -> {
                    authenticate(active);
                    try {
                        return new TransactionTemplate(transactionManager).execute(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            return memoReportService.getMemoReport(id);
                        });
                    } finally { SecurityContextHolder.clearContext(); }
                });
                waitForBlockingPid(application, blockerPid.get(), "tb_memo_rpt_info", reader);
            } finally { release.countDown(); }
            writer.get(20, TimeUnit.SECONDS);
            MemoReportDto response = reader.get(20, TimeUnit.SECONDS);
            assertThat(response.getRptCn()).isEqualTo("committed body B");
            authenticate(active);
            assertThat(memoReportService.getMemoReport(id).getInstructionReadToken()).isEqualTo(response.getInstructionReadToken());
            memoReportService.updateDrctMatter(id, "read body B", response.getInstructionReadToken());
        }
    }

    private static String login(String id) { return id + "L"; }

    private void authenticate(String id, String... permissions) {
        List<String> granted = permissions.length == 0 ? List.of("MEMO_RPT_INSTRUCT", "FILE_READ") : List.of(permissions);
        var principal = CustomUserDetails.builder().userId(login(id)).esntlId(id).enabled(true)
                .lockAt("N").groups(List.of()).permissions(granted).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private long upload() throws java.io.IOException {
        authenticate(sender);
        long group = files.uploadFiles(List.of(new MockMultipartFile("files", "fixture.txt", "text/plain",
                "durable fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        attachmentGroups.add(group);
        return group;
    }

    private long attachedMemo(long group) {
        authenticate(sender);
        MemoReportDto value = memo(active);
        value.setAtchFileSn(group);
        return memoReportService.createMemoReport(sender, value);
    }

    private void mutate(long group, String mutation) {
        if (mutation.equals("delete") || mutation.equals("reuse")) {
            deletedFileIds.add(details.findByFileMasterAtchFileSnAndAtchFileSeq(group, 1).orElseThrow().getId().toString());
            // 개별 삭제 API 는 개인 귀속 첨부를 지우지 않는다(ADR-0048). 토큰은 묶음이 어떤 경로로 바뀌든 거부해야 하므로
            // FileService#deleteFile 과 같은 부모 잠금을 쥐고 묶음을 바꾼다.
            new org.springframework.transaction.support.TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                masters.findByIdForUpdate(group).orElseThrow();
                details.delete(details.findByFileMasterAtchFileSnAndAtchFileSeq(group, 1).orElseThrow());
            });
        }
        if (mutation.equals("append") || mutation.equals("reuse")) {
            try {
                files.updateFiles(group, List.of(new MockMultipartFile("files", "fixture.txt", "text/plain",
                        "durable fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
            } catch (java.io.IOException failure) { throw new java.io.UncheckedIOException(failure); }
        }
    }

    private Map<String, Object> reportRow(long id) {
        return jdbc.queryForMap("SELECT * FROM tb_memo_rpt_info WHERE memo_rpt_sn=?", id);
    }

    private long fileCount(long group) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_file_detail WHERE atch_file_sn=?", Long.class, group);
    }

    private List<Long> effectCounts() {
        long notifications = notificationModule ? jdbc.queryForObject(
                "SELECT count(*) FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)",
                Long.class, sender, active, waiting, disabled, missing) : 0;
        long intents = jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' "
                + "AND job_cn::jsonb->>'receiver' IN (?, ?, ?, ?, ?)", Long.class, sender, active, waiting, disabled, missing);
        long fileJobs = deletedFileIds.stream().mapToLong(fileId -> jdbc.queryForObject(
                "SELECT count(*) FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?", Long.class, fileId)).sum();
        return List.of(notifications, intents, fileJobs);
    }

    private void assertStaleWithoutSideEffects(long id, String token) {
        Map<String, Object> before = reportRow(id);
        List<Long> effects = effectCounts();
        long events = applicationEvents.stream(NotificationRequestedEvent.class).count();
        assertThatThrownBy(() -> memoReportService.updateDrctMatter(id, "stale instruction", token))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(reportRow(id)).isEqualTo(before);
        assertThat(effectCounts()).isEqualTo(effects);
        assertThat(applicationEvents.stream(NotificationRequestedEvent.class).count()).isEqualTo(events);
    }

    private static void await(CountDownLatch latch) {
        try { assertThat(latch.await(25, TimeUnit.SECONDS)).isTrue(); }
        catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private static void awaitReady(CountDownLatch ready, Future<?> worker) throws Exception {
        boolean observed = ready.await(15, TimeUnit.SECONDS);
        if (!observed && worker.isDone()) worker.get();
        assertThat(observed).as("선행 트랜잭션의 실제 SQL 완료").isTrue();
    }

    private void waitForBlockingPid(String application, int blockerPid, String table, Future<?> worker) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        boolean waiting;
        do {
            waiting = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                    + "WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock' "
                    + "AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE ?)",
                    Boolean.class, application, blockerPid, "%" + table + "%"));
            if (!waiting && worker.isDone()) worker.get();
            if (!waiting) Thread.sleep(20);
        } while (!waiting && System.nanoTime() < deadline);
        assertThat(waiting).as("해당 선행 트랜잭션 PID가 %s 행 잠금을 막는다", table).isTrue();
    }

    private MemoReportDto memo(String receiver) {
        return MemoReportDto.builder().rptTtl(fixtureId).rptCn("original").rptrId(receiver).build();
    }

    private void waitForDatabaseLock(String application, int expected) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                    + "AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
            if (waiting < expected) Thread.sleep(20);
        } while (waiting < expected && System.nanoTime() < deadline);
        assertThat(waiting).as("실제 PostgreSQL 행 잠금 대기").isEqualTo(expected);
    }

    private String unavailable(String state) {
        return switch (state) {
            case "A" -> waiting;
            case "D" -> disabled;
            default -> missing;
        };
    }
}
