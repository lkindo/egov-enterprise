package nuri.api.schema;

import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.business.service.note.NoteService;
import nuri.business.service.note.dto.NoteDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 실제 서비스 트랜잭션과 PostgreSQL의 신규 배정 검증·알림과 전달 의도의 원자 저장을 확인한다. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class AssignmentRecipientIntegrityIntegrationTest {

    @Autowired private NoteService noteService;
    @Autowired private DeptJobService deptJobService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;

    private String fixtureId;
    private String sender;
    private String active;
    private String waiting;
    private String disabled;
    private String missing;

    @BeforeEach
    void seedOnlyDisposableDatabaseUsers() {
        fixtureId = "R2" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        sender = fixtureId + "S";
        active = fixtureId + "P";
        waiting = fixtureId + "A";
        disabled = fixtureId + "D";
        missing = fixtureId + "M";
        insertUser(sender, "P");
        insertUser(active, "P");
        insertUser(waiting, "A");
        insertUser(disabled, "D");
        var principal = CustomUserDetails.builder().userId(sender).esntlId(sender)
                .enabled(true).permissions(List.of("DEPT_JOB_UPDATE_ALL")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThat(AopUtils.isAopProxy(noteService)).isTrue();
        assertThat(AopUtils.isAopProxy(deptJobService)).isTrue();
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
            SecurityContextHolder.clearContext();
            jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver' IN (?, ?, ?, ?, ?)",
                    sender, active, waiting, disabled, missing);
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id IN (?, ?, ?, ?, ?)",
                    sender, active, waiting, disabled, missing);
            jdbc.update("DELETE FROM tb_note_rcptn WHERE note_sn IN (SELECT note_sn FROM tb_note_info WHERE note_ttl=?)",
                    fixtureId);
            jdbc.update("DELETE FROM tb_note_sndng WHERE sndr_id=?", sender);
            jdbc.update("DELETE FROM tb_note_info WHERE note_ttl=?", fixtureId);
            jdbc.update("DELETE FROM tb_dept_task_info WHERE frst_rgtr_id=?", sender);
            jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?, ?, ?, ?)", sender, active, waiting, disabled);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "A", "D"})
    @DisplayName("정상 수신자와 없는·비활성 수신자가 섞이면 쪽지·발신·수신·알림 행이 모두 0이다")
    void mixedRecipientsLeaveNoCommittedRows(String state) throws InterruptedException {
        assertThatThrownBy(() -> noteService.sendNote(sender, note(active + ", " + unavailable(state))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertNoteRows(0);
        assertThat(notificationCount()).isZero();
    }

    @Test
    @DisplayName("정상 쪽지는 관계 전체를 커밋하고 실제 알림 행을 만든다")
    void activeRecipientCommitsNoteGraphAndNotification() throws InterruptedException {
        noteService.sendNote(sender, note(active));

        assertNoteRows(1);
        assertThat(notificationCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("상위 트랜잭션 롤백은 쪽지·알림·전달 의도를 함께 되돌린다")
    void rollbackRemovesTheWholeNoteGraphAndDoesNotNotify() throws InterruptedException {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            noteService.sendNote(sender, note(active));
            assertNoteRows(1);
            assertThat(notificationCount()).isEqualTo(1);
            assertThat(deliveryIntentCount()).isEqualTo(1);
            status.setRollbackOnly();
        });

        assertNoteRows(0);
        assertThat(notificationCount()).isZero();
        assertThat(deliveryIntentCount()).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "A", "D"})
    @DisplayName("없는·비활성 신규 담당자는 업무 생성과 알림을 남기지 않는다")
    void unavailableAssigneeCannotCreateJob(String state) throws InterruptedException {
        assertThatThrownBy(() -> deptJobService.createDeptJob(job(unavailable(state))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_dept_task_info WHERE frst_rgtr_id=?",
                Long.class, sender)).isZero();
        assertThat(notificationCount()).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "A", "D"})
    @DisplayName("없는·비활성 담당자로 변경하면 기존 업무와 감사 필드가 DB에서도 그대로 남는다")
    void unavailableReplacementLeavesStoredJobUnchanged(String state) throws InterruptedException {
        long id = insertJob(sender);
        var original = jdbc.queryForMap("SELECT * FROM tb_dept_task_info WHERE dept_task_sn=?", id);

        assertThatThrownBy(() -> deptJobService.updateDeptJob(id, job(unavailable(state))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(jdbc.queryForMap("SELECT * FROM tb_dept_task_info WHERE dept_task_sn=?", id)).isEqualTo(original);
        assertThat(notificationCount()).isZero();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("기존 비활성 담당자를 생략하거나 그대로 보내도 업무 정정을 커밋한다")
    void unchangedInactiveAssigneeAllowsContentCorrection(boolean explicitAssignee) throws InterruptedException {
        long id = insertJob(disabled);

        deptJobService.updateDeptJob(id, job(explicitAssignee ? disabled : null));

        assertThat(jdbc.queryForMap("SELECT dept_task_nm, dept_task_cn, pic_id FROM tb_dept_task_info WHERE dept_task_sn=?", id))
                .containsEntry("dept_task_nm", fixtureId)
                .containsEntry("dept_task_cn", "corrected")
                .containsEntry("pic_id", disabled);
        assertThat(notificationCount()).isZero();
    }

    @Test
    @DisplayName("활성 담당자에게 새 업무를 배정하면 업무와 실제 알림이 저장된다")
    void activeAssigneeCommitsJobAndNotification() throws InterruptedException {
        long id = deptJobService.createDeptJob(job(active));

        assertThat(jdbc.queryForObject("SELECT pic_id FROM tb_dept_task_info WHERE dept_task_sn=?", String.class, id))
                .isEqualTo(active);
        assertThat(notificationCount()).isEqualTo(1);
    }

    private void insertUser(String id, String state) {
        jdbc.update("INSERT INTO tb_user_info(esntl_id, user_id, pswd, user_nm, user_stts_cd, lck_yn, sbscrb_ymd) "
                + "VALUES (?, ?, 'test-only-unusable', '시험 계정', ?, 'N', to_char(CURRENT_DATE, 'YYYYMMDD'))",
                id, id, state);
    }

    private long insertJob(String assignee) {
        return jdbc.queryForObject("INSERT INTO tb_dept_task_info(dept_task_nm, dept_task_cn, pic_id, frst_rgtr_id, last_mdfr_id) "
                + "VALUES (?, 'original', ?, ?, ?) RETURNING dept_task_sn", Long.class, fixtureId + "-original", assignee, sender, sender);
    }

    private String unavailable(String state) {
        return switch (state) {
            case "A" -> waiting;
            case "D" -> disabled;
            default -> missing;
        };
    }

    private NoteDto note(String recipients) {
        return NoteDto.builder().noteSj(fixtureId).noteCn("test content").rcverId(recipients).build();
    }

    private DeptJobDto job(String assignee) {
        var dto = new DeptJobDto();
        dto.setDeptTaskNm(fixtureId);
        dto.setDeptTaskCn("corrected");
        dto.setPicId(assignee);
        return dto;
    }

    private void assertNoteRows(long expected) {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_note_info WHERE note_ttl=?", Long.class, fixtureId))
                .isEqualTo(expected);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_note_sndng WHERE sndr_id=?", Long.class, sender))
                .isEqualTo(expected);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_note_rcptn WHERE rcvr_id IN (?, ?, ?, ?)",
                Long.class, active, waiting, disabled, missing)).isEqualTo(expected);
    }

    private long deliveryIntentCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver' IN (?, ?, ?, ?, ?)",
                Long.class, sender, active, waiting, disabled, missing);
    }

    private long notificationCount() {
        // 실제 notification 소비자를 사용해 이 통합 검증의 선택 도메인 의존성도 명시한다.
        return List.of(sender, active, waiting, disabled, missing).stream()
                .mapToLong(receiver -> notificationRepository.searchNotificationsByReceiver(receiver, null, null,
                        org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements()).sum();
    }

}
