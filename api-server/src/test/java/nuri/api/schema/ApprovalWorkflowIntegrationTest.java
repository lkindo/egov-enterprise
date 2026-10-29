package nuri.api.schema;

import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.event.SanctionEventListener;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.ClassUtils;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Real Flyway, PostgreSQL transactions and repositories; external notification handlers are inert.
 *
 * <p>이 클래스는 알림 타입을 하나도 참조하지 않는다 — 그래서 알림이 없는 '공통 기반 + 결재' 생성물에도 남는다(GAP-BASE-003).
 * 알림이 있는 구성에서는 결재가 발행한 알림 요청을 실제 알림 리스너가 받아 사용자 FK 가 있는 알림 행을 쓰는데, 이 클래스의
 * 결재자·참조자는 사용자 행이 없다. 그래서 그 리스너의 bean 정의를 이름(문자열)으로 걷는다. 알림 행까지 보는 시험은
 * 결재와 알림이 함께 소유한 ApprovalReferenceNotificationIntegrationTest 에 있다.
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import({AuthorizationSchemaRehearsalTestConfiguration.class,
        ApprovalWorkflowIntegrationTest.InAppNotificationsOffTestConfiguration.class})
@ActiveProfiles({"test", "tc"})
class ApprovalWorkflowIntegrationTest {
    private static final String OWNER = "WF_OWNER";
    private static final String FIRST = "WF_FIRST";
    private static final String SECOND = "WF_SECOND";
    private static final String FINAL = "WF_FINAL";
    /** 임시저장 기안자 — 임시저장은 사용자 행에 FK 로 묶이므로 이 사람만 실제 tb_user_info 행을 둔다(테스트가 넣고 지운다). */
    private static final String DRAFTER = "WF_DRAFTER";
    /** [2026-10-04 D4] 참조자 — 결재 조회 권한(APPROVAL_READ)만 있고 결재 권한은 없다. */
    private static final String REFERENCE = "WF_REFERENCE";
    private static final String LATE_REFERENCE = "WF_LATE_REFERENCE";
    /** 알림 기능의 알림 요청 리스너 — 타입으로 쓰면 이 클래스가 알림 없는 구성에서 함께 지워지므로 이름으로만 가리킨다. */
    private static final String IN_APP_NOTIFICATION_LISTENER = "nuri.business.service.notification.listener.NotificationRequestListener";
    @Autowired private InformalSanctionService service;
    @Autowired private nuri.business.service.informalsanction.ApprovalTemporaryDraftService drafts;
    @Autowired private nuri.business.service.informalsanction.ApprovalSavedLineService savedLines;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ApplicationContext applicationContext;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private ProcessReadProbe processReadProbe;
    @MockitoBean private UserRepository users;
    @MockitoBean private CommonCodeService codes;
    @MockitoBean private SanctionEventListener finalNotifications;
    private final List<Long> ownDocuments = new ArrayList<>();

    @BeforeEach
    void availableParticipants() {
        // 알림 기능이 있으면(클래스) 알림 테이블도 있다. 리스너가 개명·이동되면 무력화를 확인할 수 없으므로 여기서 붉다.
        // 수동 도메인 삭제(scripts/delete-domain.ps1)는 Java 소스만 지우고 Flyway DDL 을 남기므로, 알림만 수동으로 지운
        // 트리에서도 여기서 붉다 — 그때 원인은 개명이 아니라 남은 알림 테이블(tb_user_noti, V2_0 baseline)이다.
        ClassLoader loader = getClass().getClassLoader();
        boolean listener = ClassUtils.isPresent(IN_APP_NOTIFICATION_LISTENER, loader);
        assertThat(listener).as("알림 리스너 클래스와 알림 테이블은 함께 있거나 함께 없다 — 리스너가 개명·이동됐거나, "
                        + "알림을 수동 삭제(delete-domain.ps1)해 Flyway DDL(tb_user_noti)만 남은 경우다")
                .isEqualTo(jdbc.queryForObject("SELECT to_regclass('public.tb_user_noti') IS NOT NULL", Boolean.class));
        if (listener) {
            assertThat(applicationContext.getBeanNamesForType(ClassUtils.resolveClassName(IN_APP_NOTIFICATION_LISTENER, loader)))
                    .as("알림 리스너 bean 은 이 클래스의 문맥에 없다").isEmpty();
        }
        when(codes.getCodesByGroup("COM075")).thenReturn(List.of(new CommonCodeDto("COM075", "WF", "검토", null, "Y")));
        when(users.findAllById(any())).thenAnswer(call -> {
            List<User> result = new ArrayList<>();
            Iterable<String> ids = call.getArgument(0);
            for (String id : ids) {
                result.add(User.builder().esntlId(id).userId(id).userNm(id).userSttsCd("P").build());
            }
            return result;
        });
        // 결재선 검증은 결재자의 결재 권한(APPROVAL_APPROVE)도 본다.
        when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(FIRST, SECOND, FINAL));
        // 참조자는 결재 조회 권한으로 판정한다 — 결재자들도 조회 권한은 있다.
        when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_READ"))
                .thenReturn(List.of(FIRST, SECOND, FINAL, REFERENCE, LATE_REFERENCE));
    }

    @AfterEach
    void removeOnlyOwnDocuments() {
        SecurityContextHolder.clearContext();
        for (long id : ownDocuments) {
            // 참조 행은 결재 차수 이력에 FK 로 묶이므로 이력보다 먼저 지운다.
            jdbc.update("DELETE FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_prcs_hstry WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_dtl WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_hstry WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=?", id);
        }
        ownDocuments.clear();
        jdbc.update("DELETE FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn IN "
                + "(SELECT ifml_atrz_tmpr_strg_sn FROM tb_ifml_atrz_tmpr_strg WHERE aplcnt_id=?)", DRAFTER);
        jdbc.update("DELETE FROM tb_ifml_atrz_tmpr_strg WHERE aplcnt_id=?", DRAFTER);
        jdbc.update("DELETE FROM tb_ifml_atrz_indv_apln WHERE user_id=?", DRAFTER);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", DRAFTER);
    }

    @Test
    void waitsForEveryParallelDecisionAndOnlyCountsTheCurrentActors() {
        long id = create(List.of(stage(ApprovalStageKind.AGREEMENT, FIRST, SECOND), stage(ApprovalStageKind.APPROVAL, FINAL)));
        authenticate(FINAL);
        assertThat(service.getPendingApprovalCount(FINAL)).isZero();
        assertThatThrownBy(() -> service.confirmInformalSanction(id, "C", null)).isInstanceOf(BusinessException.class);
        // Approve the second participant first: the representative stays FIRST, exercising force-increment.
        authenticate(SECOND);
        assertThat(service.getPendingApprovalCount(SECOND)).isEqualTo(1);
        int readVersion = service.getInformalSanction(id, SECOND).getVersion();
        service.confirmInformalSanction(id, "C", "검토 완료", readVersion);
        assertThat(service.getPendingApprovalCount(SECOND)).isZero();
        assertThat(service.getProcessedApprovalList(SECOND, org.springframework.data.domain.Pageable.unpaged()).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).contains(id);
        authenticate(FIRST);
        assertThat(service.getPendingApprovalCount(FIRST)).isEqualTo(1);
        assertThatThrownBy(() -> service.confirmInformalSanction(id, "C", null, readVersion))
                .isInstanceOf(BusinessException.class).hasMessageContaining("최신 상태");
        service.confirmInformalSanction(id, "C", null, service.getInformalSanction(id, FIRST).getVersion());
        authenticate(FINAL);
        assertThat(service.getPendingApprovalCount(FINAL)).isEqualTo(1);
        service.confirmInformalSanction(id, "C", null, service.getInformalSanction(id, FINAL).getVersion());
        authenticate(OWNER);
        var result = service.getInformalSanction(id, OWNER);
        assertThat(result.getAprvYn()).isEqualTo("C");
        assertThat(result.getStages()).allMatch(s -> s.status().name().equals("APPROVED"));
        assertThat(result.getStages().getFirst().approvers()).anyMatch(a -> "검토 완료".equals(a.opinion()));
        assertThat(result.isCanWithdraw()).isFalse();
    }

    @Test
    void preservesRejectedRevisionAndDoesNotDiscloseTheNextRevisionToRemovedParticipants() {
        long id = create(List.of(stage(ApprovalStageKind.APPROVAL, FIRST)));
        authenticate(FIRST);
        service.confirmInformalSanction(id, "R", "근거 보완");
        authenticate(OWNER);
        int version = service.getInformalSanction(id, OWNER).getVersion();
        var revised = document("수정한 제목", "새 결재자에게만 공개하는 내용");
        service.resubmitInformalSanction(id, revised, version, List.of(stage(ApprovalStageKind.APPROVAL, SECOND)));
        var ownerView = service.getInformalSanction(id, OWNER);
        assertThat(ownerView.getAtrzCycl()).isEqualTo(2);
        assertThat(ownerView.getHistory()).hasSize(2);
        assertThat(ownerView.getHistory().get(1).docCn()).isEqualTo("최초 문서 내용");
        assertThat(ownerView.getHistory().get(1).aprvYn()).isEqualTo("R");
        authenticate(FIRST);
        var oldParticipant = service.getInformalSanction(id, FIRST);
        assertThat(oldParticipant.getDocTtl()).isEqualTo("검토 요청");
        assertThat(oldParticipant.getDocCn()).isEqualTo("최초 문서 내용");
        assertThat(oldParticipant.getAtrzCycl()).isEqualTo(1);
        assertThat(oldParticipant.getHistory()).hasSize(1);
        assertThat(oldParticipant.getVersion()).isNull();
        assertThat(oldParticipant.isCanApprove()).isFalse();
        var processed = service.getProcessedApprovalList(FIRST, PageRequest.of(0, 10));
        assertThat(processed.getContent()).anySatisfy(document -> {
            assertThat(document.getIfmlAtrzSn()).isEqualTo(id);
            assertThat(document.getDocCn()).isEqualTo("최초 문서 내용");
            assertThat(document.getAtrzCycl()).isEqualTo(1);
            assertThat(document.getVersion()).isNull();
        });
        authenticate(SECOND);
        assertThat(service.getInformalSanction(id, SECOND).getHistory()).hasSize(1);
        assertThatThrownBy(() -> service.deleteInformalSanction(id)).isInstanceOf(BusinessException.class);
        authenticate("WF_OUTSIDER");
        assertThatThrownBy(() -> service.getInformalSanction(id, "WF_OUTSIDER")).isInstanceOf(BusinessException.class);
    }

    @Test
    void withdrawalRetainsCompletedDecisionsAndCanBeResubmitted() {
        long id = create(List.of(stage(ApprovalStageKind.APPROVAL, FIRST), stage(ApprovalStageKind.APPROVAL, SECOND)));
        authenticate(FIRST);
        service.confirmInformalSanction(id, "C", null);
        authenticate(OWNER);
        service.deleteInformalSanction(id, service.getInformalSanction(id, OWNER).getVersion());
        var withdrawn = service.getInformalSanction(id, OWNER);
        assertThat(withdrawn.getAprvYn()).isEqualTo("W");
        assertThat(withdrawn.getStages().getFirst().status().name()).isEqualTo("APPROVED");
        assertThat(withdrawn.getStages().get(1).status().name()).isEqualTo("CANCELLED");
        assertThat(withdrawn.isCanResubmit()).isTrue();
        service.resubmitInformalSanction(id, document("재상신", "수정 내용"), withdrawn.getVersion(),
                List.of(stage(ApprovalStageKind.APPROVAL, FIRST, SECOND)));
        assertThat(service.getInformalSanction(id, OWNER).getHistory()).hasSize(2);
    }

    @Test
    void concurrentParallelDecisionsCommitOnceAndAdvanceToTheNextStage() throws Exception {
        long id = create(List.of(stage(ApprovalStageKind.AGREEMENT, FIRST, SECOND), stage(ApprovalStageKind.APPROVAL, FINAL)));
        CountDownLatch ready = new CountDownLatch(2);
        try (var executor = Executors.newFixedThreadPool(2); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement("SELECT ifml_atrz_sn FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=? FOR UPDATE")) {
                statement.setLong(1, id);
                statement.executeQuery().close();
            }
            var first = executor.submit(() -> decide(id, FIRST, "approval-wf-first", ready));
            var second = executor.submit(() -> decide(id, SECOND, "approval-wf-second", ready));
            try {
                assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue();
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("""
                            SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()
                            AND application_name LIKE 'approval-wf-%' AND wait_event_type='Lock'
                            """, Integer.class);
                    if (waiting < 2) Thread.sleep(20);
                } while (waiting < 2 && System.nanoTime() < deadline);
                assertThat(waiting).as("both real transactions wait on the document lock").isEqualTo(2);
            } finally {
                blocker.rollback();
            }
            assertThat(first.get(20, TimeUnit.SECONDS)).isTrue();
            assertThat(second.get(20, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_dtl WHERE ifml_atrz_sn=? AND aprv_yn='C'", Integer.class, id))
                .isEqualTo(2);
        authenticate(FINAL);
        assertThat(service.getPendingApprovalCount(FINAL)).isEqualTo(1);
    }

    private boolean decide(long id, String actor, String applicationName, CountDownLatch ready) {
        authenticate(actor);
        try {
            return Boolean.TRUE.equals(new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, applicationName);
                ready.countDown();
                service.confirmInformalSanction(id, "C", null);
                return true;
            }));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * [2026-10-03 D7] 처리 이력은 행위자를 두 축으로 남긴다 — 대조·이름 표시는 esntlId(chg_user_idntfr), 감사 컬럼은
     * 로그인 ID(frst_rgtr_id). 로그인 ID 와 esntlId 를 다르게 둬야 축을 섞은 매핑이 드러난다.
     */
    @Test
    void supplementHistoryKeepsEsntlIdForMatchingAndLoginIdForAuditOnPostgres() {
        long id = create(List.of(stage(ApprovalStageKind.APPROVAL, FIRST)));
        authenticate(FIRST, "wf_first_login");
        service.requestSupplement(id, "금액을 적어 주세요", null);
        authenticate(OWNER, "wf_owner_login");
        var asked = service.getInformalSanction(id, OWNER);
        assertThat(asked.getOpenSupplement()).isNotNull();
        assertThat(asked.getOpenSupplement().askedBy()).isEqualTo(FIRST);
        assertThat(asked.isCanAnswerSupplement()).isTrue();

        service.answerSupplement(id, "45만 원입니다", "최초 문서 내용\n교육비: 45만 원", asked.getVersion());

        assertThat(jdbc.queryForList("""
                SELECT prcs_type_cd, chg_user_idntfr, frst_rgtr_id, trgt_user_id FROM tb_ifml_atrz_prcs_hstry
                WHERE ifml_atrz_sn=? ORDER BY ifml_atrz_prcs_hstry_sn
                """, id)).extracting(row -> List.of(row.get("prcs_type_cd"), row.get("chg_user_idntfr"),
                        row.get("frst_rgtr_id"), String.valueOf(row.get("trgt_user_id"))))
                .containsExactly(List.of("ASK", FIRST, "wf_first_login", OWNER),
                        List.of("ANSWER", OWNER, "wf_owner_login", FIRST),
                        List.of("REVISE", OWNER, "wf_owner_login", "null"));
        var answered = service.getInformalSanction(id, OWNER);
        assertThat(answered.getOpenSupplement()).isNull();
        assertThat(answered.getDocTtl()).isEqualTo("검토 요청");
        assertThat(answered.getDocCn()).isEqualTo("최초 문서 내용\n교육비: 45만 원");
        assertThat(answered.getProcessHistory()).extracting(row -> row.actorNm())
                .containsExactly(FIRST, OWNER, OWNER);
    }

    @Test
    void listFiltersApplyTitleDateAndStatusOnPostgres() {
        long discount = createDocument("할인 100% 요청", "20260910");
        long other = createDocument("할인 1000 요청", "20260920");
        authenticate(OWNER);

        // 조건 없음 — null 파라미터가 PostgreSQL 에서 형식 추론 오류 없이 '조건 없음' 으로 해석된다.
        assertThat(service.getInformalSanctionList(OWNER, nuri.business.service.informalsanction.ApprovalListFilter.NONE,
                PageRequest.of(0, 50)).getContent()).extracting(InformalSanctionDto::getIfmlAtrzSn).contains(discount, other);
        // '%' 는 와일드카드가 아니라 글자다.
        assertThat(service.getInformalSanctionList(OWNER, nuri.business.service.informalsanction.ApprovalListFilter.of(
                "100%", null, null, null), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).contains(discount).doesNotContain(other);
        // 요청일 포함 범위.
        assertThat(service.getInformalSanctionList(OWNER, nuri.business.service.informalsanction.ApprovalListFilter.of(
                null, "2026-09-15", "2026-09-30", null), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).contains(other).doesNotContain(discount);
        // 문서 상태.
        assertThat(service.getInformalSanctionList(OWNER, nuri.business.service.informalsanction.ApprovalListFilter.of(
                null, null, null, "C"), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).doesNotContain(discount, other);

        // [2026-10-01] 검색어는 문서 번호에서도 찾는다 — 알림이 말하는 '결재(번호 N)' 으로 문서를 찾을 수 있어야 한다.
        assertThat(service.getInformalSanctionList(OWNER, nuri.business.service.informalsanction.ApprovalListFilter.of(
                String.valueOf(other), null, null, null), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).contains(other);

        authenticate(FIRST);
        assertThat(service.getPendingApprovalList(FIRST, nuri.business.service.informalsanction.ApprovalListFilter.of(
                "할인 1000", null, null, null), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).containsExactly(other);
    }

    /**
     * [2026-10-03 D3] 서버 임시저장 왕복. 실제 PostgreSQL 에서 — 같은 결재선을 다시 저장해도 기본 키가 부딪히지 않고(지운
     * 뒤 넣는다), 결재선만 바뀐 저장도 버전이 오르며, 읽은 버전이 다르면 409 다. 상신은 임시저장을 같은 트랜잭션에서
     * 소비한다 — 상신 검사가 실패하면 되돌아가 임시저장이 남고, 성공하면 결재선까지 사라진다.
     */
    @Test
    void temporaryDraftRoundTripsAndIsConsumedOnlyBySuccessfulSubmission() {
        seedDrafter();
        authenticate(DRAFTER);
        var line = List.of(stage(ApprovalStageKind.AGREEMENT, FIRST, SECOND), stage(ApprovalStageKind.APPROVAL, FINAL));
        var saved = drafts.createTemporaryDraft(DRAFTER, draftRequest("쓰다 만 기안", line, null));
        long sn = saved.temporaryDraftSn();
        assertThat(saved.version()).isZero();
        assertThat(saved.approverCount()).isEqualTo(3);
        assertThat(saved.taskSeNm()).isEqualTo("검토");
        assertThat(saved.mdfcnDt()).isNotNull();

        var sameLine = drafts.updateTemporaryDraft(DRAFTER, sn, draftRequest("쓰다 만 기안(고침)", line, saved.version()));
        assertThat(sameLine.version()).as("같은 결재선을 다시 넣어도 기본 키가 부딪히지 않는다").isGreaterThan(saved.version());
        var lineOnly = drafts.updateTemporaryDraft(DRAFTER, sn,
                draftRequest("쓰다 만 기안(고침)", List.of(stage(ApprovalStageKind.APPROVAL, FINAL)), sameLine.version()));
        assertThat(lineOnly.version()).as("결재선만 바뀌어도 버전이 오른다").isGreaterThan(sameLine.version());
        assertThatThrownBy(() -> drafts.updateTemporaryDraft(DRAFTER, sn, draftRequest("옛 화면", line, saved.version())))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);

        var opened = drafts.getTemporaryDraft(DRAFTER, sn);
        assertThat(opened.docTtl()).isEqualTo("쓰다 만 기안(고침)");
        assertThat(opened.version()).isEqualTo(lineOnly.version());
        assertThat(opened.stages()).singleElement().satisfies(stage -> {
            assertThat(stage.kind()).isEqualTo(ApprovalStageKind.APPROVAL);
            assertThat(stage.approvers()).extracting(a -> a.esntlId(), a -> a.eligible()).containsExactly(
                    org.assertj.core.groups.Tuple.tuple(FINAL, true));
        });
        assertThat(drafts.getTemporaryDrafts(DRAFTER)).extracting(d -> d.temporaryDraftSn()).containsExactly(sn);
        authenticate(OWNER);
        assertThatThrownBy(() -> drafts.getTemporaryDraft(OWNER, sn)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);

        authenticate(DRAFTER);
        var document = InformalSanctionDto.builder().aplcntId(DRAFTER).taskSeCd("WF").reqYmd("20261003")
                .docTtl("쓰다 만 기안(고침)").docCn("본문").build();
        int approvals = countApprovals();
        assertThatThrownBy(() -> drafts.submitWithTemporaryDraft(document,
                List.of(stage(ApprovalStageKind.APPROVAL, FINAL)), null, sn, saved.version()))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> drafts.submitWithTemporaryDraft(document,
                List.of(stage(ApprovalStageKind.APPROVAL, "WF_NOPERM")), null, sn, lineOnly.version()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("결재 권한");
        assertThat(countApprovals()).isEqualTo(approvals);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).as("상신이 실패하면 임시저장과 결재선이 되살아난다").isEqualTo(1);

        long id = drafts.submitWithTemporaryDraft(document, List.of(stage(ApprovalStageKind.APPROVAL, FINAL)), null, sn,
                lineOnly.version());
        ownDocuments.add(id);
        assertThat(service.getInformalSanction(id, DRAFTER).getDocTtl()).isEqualTo("쓰다 만 기안(고침)");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).isZero();
        assertThatThrownBy(() -> drafts.submitWithTemporaryDraft(document, List.of(stage(ApprovalStageKind.APPROVAL, FINAL)),
                null, sn, lineOnly.version())).as("같은 임시저장으로 두 번 올리지 않는다").isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(drafts.getTemporaryDrafts(DRAFTER)).isEmpty();
    }

    /**
     * [2026-10-16 D2] 나의 결재선. 실제 PostgreSQL 에서 저장·목록·불러오기·덮어쓰기(같은 단계·사람을 다시 넣어도 기본 키가
     * 부딪히지 않는다)·지우기를 하고, 이름 유니크·주인 한정·20개 상한·불러올 때의 자격 재판정을 본다.
     */
    @Test
    void savedLineRoundTripsAndRechecksEligibilityOnPostgres() {
        seedDrafter();
        authenticate(DRAFTER);
        var line = List.of(stage(ApprovalStageKind.AGREEMENT, FIRST, SECOND), stage(ApprovalStageKind.APPROVAL, FINAL));
        var saved = savedLines.createSavedLine(DRAFTER, savedLineRequest("팀장 결재", line));
        long sn = saved.savedLineSn();
        assertThat(saved.stageCount()).isEqualTo(2);
        assertThat(saved.approverCount()).isEqualTo(3);
        assertThat(saved.mdfcnDt()).isNotNull();

        var overwritten = savedLines.updateSavedLine(DRAFTER, sn, savedLineRequest("팀장 결재", line));
        assertThat(overwritten.savedLineSn()).as("같은 단계·사람을 다시 넣어도 기본 키가 부딪히지 않는다").isEqualTo(sn);
        assertThatThrownBy(() -> savedLines.createSavedLine(DRAFTER, savedLineRequest("팀장 결재",
                List.of(stage(ApprovalStageKind.APPROVAL, FINAL))))).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.DUPLICATE_RESOURCE);
        assertThat(savedLines.getSavedLines(DRAFTER)).extracting(l -> l.savedLineSn(), l -> l.aplnNm())
                .containsExactly(org.assertj.core.groups.Tuple.tuple(sn, "팀장 결재"));

        // 저장한 뒤 SECOND 가 결재 권한을 잃었다 — 불러오면 이름 없이 빠지고 그 수만 온다.
        when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(FIRST, FINAL));
        var loaded = savedLines.getSavedLine(DRAFTER, sn);
        assertThat(loaded.droppedApproverCount()).isEqualTo(1);
        assertThat(loaded.droppedStageCount()).isZero();
        assertThat(loaded.stages()).extracting(s -> s.kind())
                .containsExactly(ApprovalStageKind.AGREEMENT, ApprovalStageKind.APPROVAL);
        assertThat(loaded.stages()).flatExtracting(s -> s.approvers()).extracting(p -> p.esntlId())
                .containsExactly(FIRST, FINAL);
        assertThatThrownBy(() -> savedLines.createSavedLine(DRAFTER, savedLineRequest("권한 잃은 사람", line)))
                .as("저장도 지금 자격으로 판정한다").isInstanceOf(BusinessException.class).hasMessageContaining("1단계");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_indv_apln WHERE user_id=?", Integer.class, DRAFTER))
                .isEqualTo(1);

        authenticate(OWNER);
        assertThatThrownBy(() -> savedLines.getSavedLine(OWNER, sn)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
        assertThatThrownBy(() -> savedLines.deleteSavedLine(OWNER, sn)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);

        authenticate(DRAFTER);
        for (int i = 2; i <= 20; i++) {
            savedLines.createSavedLine(DRAFTER, savedLineRequest("결재선 " + i, List.of(stage(ApprovalStageKind.APPROVAL, FINAL))));
        }
        assertThatThrownBy(() -> savedLines.createSavedLine(DRAFTER, savedLineRequest("스물한째",
                List.of(stage(ApprovalStageKind.APPROVAL, FINAL))))).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE);
        assertThat(savedLines.getSavedLines(DRAFTER)).hasSize(20);

        savedLines.deleteSavedLine(DRAFTER, sn);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_indv_apln_dtl WHERE ifml_atrz_indv_apln_sn=?",
                Integer.class, sn)).as("결재선 행은 결재선과 함께 지워진다").isZero();
        assertThatThrownBy(() -> savedLines.deleteSavedLine(DRAFTER, sn)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    /** 지운 임시저장은 결재선까지 사라지고, 같은 번호로 다시 지우면 404 다. */
    @Test
    void deletingTemporaryDraftRemovesItsLine() {
        seedDrafter();
        authenticate(DRAFTER);
        long sn = drafts.createTemporaryDraft(DRAFTER,
                draftRequest(null, List.of(stage(ApprovalStageKind.APPROVAL, FIRST, SECOND)), null)).temporaryDraftSn();

        drafts.deleteTemporaryDraft(DRAFTER, sn);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).isZero();
        assertThatThrownBy(() -> drafts.deleteTemporaryDraft(DRAFTER, sn)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    /**
     * [2026-10-04 D4] 참조자는 결재 문서를 늘 읽는다 — 반려·재상신·승인 뒤에도, 재상신에서 빠진 뒤에도. 실제 PostgreSQL 질의로
     * 열람 관문·목록의 차수 선택이 참조자를 받는지, 대기 건수·대기함·처리함에 섞이지 않는지, 외부인은 여전히 404 인지를 본다.
     */
    @Test
    void referenceKeepsReadingAcrossRejectionResubmissionAndApprovalOnPostgres() {
        authenticate(OWNER);
        long id = service.registerInformalSanction(document("검토 요청", "최초 문서 내용"),
                List.of(stage(ApprovalStageKind.APPROVAL, FIRST)), List.of(REFERENCE));
        ownDocuments.add(id);

        authenticate(REFERENCE);
        var first = service.getInformalSanction(id, REFERENCE);
        assertThat(first.isReferenceViewer()).isTrue();
        assertThat(first.isCanApprove()).isFalse();
        assertThat(service.getPendingApprovalCount(REFERENCE)).as("참조자는 결재하지 않는다").isZero();
        assertThat(service.getPendingApprovalList(REFERENCE, PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).doesNotContain(id);
        assertThat(service.getReferencedApprovalList(REFERENCE,
                nuri.business.service.informalsanction.ApprovalListFilter.NONE, PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).contains(id);

        authenticate(FIRST);
        service.confirmInformalSanction(id, "R", "근거 보완", service.getInformalSanction(id, FIRST).getVersion());
        authenticate(REFERENCE);
        assertThat(service.getInformalSanction(id, REFERENCE).getAprvYn()).as("반려 뒤에도 읽는다").isEqualTo("R");

        // 재상신에서 참조자를 빼고(새 참조자만 지정) 결재선을 바꾼다 — 빠진 참조자도 새 차수까지 읽는다.
        authenticate(OWNER);
        service.resubmitInformalSanction(id, document("수정한 제목", "새 결재자와 참조자가 읽는 내용"),
                service.getInformalSanction(id, OWNER).getVersion(), List.of(stage(ApprovalStageKind.APPROVAL, SECOND)),
                List.of(LATE_REFERENCE));
        authenticate(REFERENCE);
        var dropped = service.getInformalSanction(id, REFERENCE);
        assertThat(dropped.getAtrzCycl()).isEqualTo(2);
        assertThat(dropped.getDocCn()).isEqualTo("새 결재자와 참조자가 읽는 내용");
        assertThat(dropped.getHistory()).extracting(revision -> revision.atrzCycl()).containsExactly(2, 1);
        assertThat(dropped.getReferences()).extracting(reference -> reference.userId())
                .containsExactly(REFERENCE, LATE_REFERENCE);
        assertThat(service.getReferencedApprovalList(REFERENCE,
                nuri.business.service.informalsanction.ApprovalListFilter.NONE, PageRequest.of(0, 50)).getContent())
                .filteredOn(row -> row.getIfmlAtrzSn() == id).singleElement()
                .satisfies(row -> {
                    assertThat(row.getAtrzCycl()).as("목록도 지금 차수를 싣는다").isEqualTo(2);
                    // 목록의 결재선·차수 이력 질의가 참조자에게도 지금 차수를 고른다 — 결재선과 지금 단계 시작 시각이 빈다면 질의가 참조자를 빠뜨린 것이다.
                    assertThat(row.getStages()).extracting(stage -> stage.approvers().getFirst().userId()).containsExactly(SECOND);
                    assertThat(row.getCurrentStageSince()).isNotNull();
                });
        // 이전 차수에만 참여한 결재자는 그대로 자기 차수만 보고, 그 뒤에 지정된 참조자를 보지 않는다.
        authenticate(FIRST);
        var oldApprover = service.getInformalSanction(id, FIRST);
        assertThat(oldApprover.getAtrzCycl()).isEqualTo(1);
        assertThat(oldApprover.getReferences()).extracting(reference -> reference.userId()).containsExactly(REFERENCE);

        authenticate(SECOND);
        service.confirmInformalSanction(id, "C", null, service.getInformalSanction(id, SECOND).getVersion());
        for (String reader : List.of(REFERENCE, LATE_REFERENCE)) {
            authenticate(reader);
            assertThat(service.getInformalSanction(id, reader).getAprvYn()).as("승인 뒤에도 읽는다").isEqualTo("C");
            assertThat(service.getProcessedApprovalList(reader, PageRequest.of(0, 50)).getContent())
                    .extracting(InformalSanctionDto::getIfmlAtrzSn).as("처리함에 섞이지 않는다").doesNotContain(id);
        }

        authenticate("WF_OUTSIDER");
        assertThatThrownBy(() -> service.getInformalSanction(id, "WF_OUTSIDER")).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);

        assertThat(jdbc.queryForList("""
                SELECT user_id, atrz_cycl, chg_user_idntfr, frst_rgtr_id FROM tb_ifml_atrz_rfpr
                WHERE ifml_atrz_sn=? ORDER BY atrz_cycl, user_id
                """, id)).extracting(row -> List.of(row.get("user_id"), String.valueOf(row.get("atrz_cycl")),
                        row.get("chg_user_idntfr"), row.get("frst_rgtr_id")))
                .containsExactly(List.of(REFERENCE, "1", OWNER, OWNER), List.of(LATE_REFERENCE, "2", OWNER, OWNER));
    }

    @Test
    void withdrawnDocumentStaysReadableForReferences() {
        authenticate(OWNER);
        long id = service.registerInformalSanction(document("검토 요청", "회수할 내용"),
                List.of(stage(ApprovalStageKind.APPROVAL, FIRST)), List.of(REFERENCE));
        ownDocuments.add(id);
        service.deleteInformalSanction(id, service.getInformalSanction(id, OWNER).getVersion());

        authenticate(REFERENCE);
        assertThat(service.getInformalSanction(id, REFERENCE).getAprvYn()).isEqualTo("W");
    }

    /**
     * [2026-10-04 D4 개정 1] 지정은 차수 단위다 — 재상신 때 다시 보낸 이전 차수 참조자는 새 차수의 행이 생겨 그 차수의 참조자가
     * 된다. 실제 PostgreSQL 기본 키(문서·차수·사람)가 같은 사람의 두 번째 행을 받는지, 그 차수에 기안자가 지정했으므로 결재자가
     * 더할 수 없는지, 그 차수의 참조자를 결재자로 바꿔 넣을 수 없는지, 목록이 사람마다 한 줄인지를 본다.
     */
    @Test
    void redesignatedReferenceBecomesTheNewCycleReferenceOnPostgres() {
        authenticate(OWNER);
        long id = service.registerInformalSanction(document("검토 요청", "최초 문서 내용"),
                List.of(stage(ApprovalStageKind.APPROVAL, FIRST)), List.of(REFERENCE));
        ownDocuments.add(id);
        authenticate(FIRST);
        service.confirmInformalSanction(id, "R", "근거 보완", service.getInformalSanction(id, FIRST).getVersion());

        authenticate(OWNER);
        service.resubmitInformalSanction(id, document("수정한 제목", "두 번째 내용"),
                service.getInformalSanction(id, OWNER).getVersion(), List.of(stage(ApprovalStageKind.APPROVAL, SECOND)),
                List.of(REFERENCE, LATE_REFERENCE));
        assertThat(jdbc.queryForList("""
                SELECT user_id, atrz_cycl FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=? ORDER BY atrz_cycl, user_id
                """, id)).extracting(row -> List.of(row.get("user_id"), String.valueOf(row.get("atrz_cycl"))))
                .containsExactly(List.of(REFERENCE, "1"), List.of(LATE_REFERENCE, "2"), List.of(REFERENCE, "2"));

        authenticate(SECOND);
        var current = service.getInformalSanction(id, SECOND);
        assertThat(current.getReferences()).extracting(reference -> reference.userId(), reference -> reference.atrzCycl())
                .as("사람마다 한 줄, 보이는 가장 최근 지정").containsExactly(org.assertj.core.groups.Tuple.tuple(REFERENCE, 2),
                        org.assertj.core.groups.Tuple.tuple(LATE_REFERENCE, 2));
        assertThat(current.isCanAddReference()).as("기안자가 이 차수에 지정했다").isFalse();
        assertThatThrownBy(() -> service.addReferences(id, List.of(FINAL), current.getVersion()))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);

        authenticate(OWNER);
        int version = service.getInformalSanction(id, OWNER).getVersion();
        assertThatThrownBy(() -> service.replaceApprover(id, SECOND, REFERENCE, version))
                .isInstanceOf(BusinessException.class).hasMessageContaining("이 차수의 참조자는 결재자로 바꿀 수 없습니다");

        authenticate(FIRST);
        assertThat(service.getInformalSanction(id, FIRST).getReferences())
                .extracting(reference -> reference.userId(), reference -> reference.atrzCycl())
                .as("차수 1 만 보는 결재자에게는 차수 1 지정만 보인다")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(REFERENCE, 1));
    }

    /**
     * [2026-10-04 D4] 결재자 추가 규칙의 세 갈래 — 차례가 아니면 403, 기안자가 이 차수에 지정했으면 409, 아무도 지정하지
     * 않았으면 지금 차례인 결재자가 더한다(문서 버전이 오르고 참조자가 읽는다).
     */
    @Test
    void approverMayAddReferencesOnlyOnTurnAndWhenDrafterDesignatedNoneOnPostgres() {
        long id = create(List.of(stage(ApprovalStageKind.APPROVAL, FIRST), stage(ApprovalStageKind.APPROVAL, SECOND)));
        authenticate(SECOND);
        int version = service.getInformalSanction(id, SECOND).getVersion();
        assertThatThrownBy(() -> service.addReferences(id, List.of(REFERENCE), version)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);

        authenticate(FIRST);
        var before = service.getInformalSanction(id, FIRST);
        assertThat(before.isCanAddReference()).isTrue();
        assertThat(service.addReferences(id, List.of(REFERENCE), before.getVersion())).isEqualTo(1);
        var after = service.getInformalSanction(id, FIRST);
        assertThat(after.getVersion()).as("참조자를 더하면 문서 버전이 오른다").isGreaterThan(before.getVersion());
        assertThat(after.getReferences()).extracting(reference -> reference.designator())
                .containsExactly(nuri.business.domain.informalsanction.ApprovalReferenceDesignator.APPROVER);
        assertThat(jdbc.queryForObject("SELECT chg_user_idntfr FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=? AND user_id=?",
                String.class, id, REFERENCE)).isEqualTo(FIRST);
        authenticate(REFERENCE);
        assertThat(service.getInformalSanction(id, REFERENCE).isReferenceViewer()).isTrue();

        // [개정 1] 이미 처리한 결재자는 결재 처리와 같은 충돌 409 다(권한 오류 403 이 아니다).
        authenticate(FIRST);
        service.confirmInformalSanction(id, "C", null, after.getVersion());
        int approvedVersion = service.getInformalSanction(id, FIRST).getVersion();
        assertThatThrownBy(() -> service.addReferences(id, List.of(LATE_REFERENCE), approvedVersion))
                .isInstanceOf(BusinessException.class).hasMessage("이미 처리한 결재입니다. 최신 상태를 확인해 주세요.")
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);

        authenticate(OWNER);
        long designated = service.registerInformalSanction(document("검토 요청", "참조자를 지정한 기안"),
                List.of(stage(ApprovalStageKind.APPROVAL, FIRST)), List.of(REFERENCE));
        ownDocuments.add(designated);
        authenticate(FIRST);
        var view = service.getInformalSanction(designated, FIRST);
        assertThat(view.isCanAddReference()).isFalse();
        assertThatThrownBy(() -> service.addReferences(designated, List.of(LATE_REFERENCE), view.getVersion()))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);
    }

    /** [2026-10-04 D4] 임시저장도 참조자를 담고, 다시 열 때 지금 참조 자격을 싣고, 상신하면 참조자가 지정되며 임시저장 참조자는 함께 지워진다. */
    @Test
    void temporaryDraftCarriesReferencesThroughSubmissionOnPostgres() {
        seedDrafter();
        authenticate(DRAFTER);
        var line = List.of(stage(ApprovalStageKind.APPROVAL, FINAL));
        var request = draftRequest("참조자를 담은 기안", line, null);
        request.setReferences(List.of(REFERENCE));
        var saved = drafts.createTemporaryDraft(DRAFTER, request);
        assertThat(saved.referenceCount()).isEqualTo(1);
        var sameAgain = draftRequest("참조자를 담은 기안", line, saved.version());
        sameAgain.setReferences(List.of(REFERENCE));
        var updated = drafts.updateTemporaryDraft(DRAFTER, saved.temporaryDraftSn(), sameAgain);
        assertThat(updated.referenceCount()).as("같은 참조자를 다시 넣어도 기본 키가 부딪히지 않는다").isEqualTo(1);

        var opened = drafts.getTemporaryDraft(DRAFTER, saved.temporaryDraftSn());
        assertThat(opened.references()).singleElement().satisfies(reference -> {
            assertThat(reference.esntlId()).isEqualTo(REFERENCE);
            assertThat(reference.referenceEligible()).isTrue();
            assertThat(reference.eligible()).as("결재 권한이 없어도 참조자는 될 수 있다").isFalse();
        });

        var document = InformalSanctionDto.builder().aplcntId(DRAFTER).taskSeCd("WF").reqYmd("20261004")
                .docTtl("참조자를 담은 기안").docCn("본문").build();
        long id = drafts.submitWithTemporaryDraft(document, line, List.of(REFERENCE), saved.temporaryDraftSn(),
                updated.version());
        ownDocuments.add(id);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=? AND user_id=?",
                Integer.class, id, REFERENCE)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_rfpr WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, saved.temporaryDraftSn())).as("임시저장 참조자는 임시저장과 함께 지워진다").isZero();
    }

    /** Actual PostgreSQL result materialization, not latency, wire bytes, or a real user-query cost. */
    @Test
    void listProcessMaterializationDoesNotGrowWithPastCycles(org.junit.jupiter.api.TestReporter reporter) {
        assertThat(applicationContext.getEnvironment().getProperty("spring.datasource.url"))
                .as("synthetic writes are limited to the existing PostgreSQL 17 Testcontainers runner")
                .startsWith("jdbc:tc:postgresql:17:");
        List<String> previous = List.of("WF_COST_OLD_1", "WF_COST_OLD_2", "WF_COST_OLD_3");
        String measurementTitle = "비용 검증 " + java.util.UUID.randomUUID();
        var measurementFilter = nuri.business.service.informalsanction.ApprovalListFilter.of(measurementTitle, null, null, null);
        List<String> eligibleApprovers = new ArrayList<>(List.of(FIRST, SECOND, FINAL));
        eligibleApprovers.addAll(previous);
        when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(eligibleApprovers);
        when(users.findProfilesByEsntlIds(any())).thenAnswer(call -> {
            List<nuri.business.service.user.dto.UserSearchDto> result = new ArrayList<>();
            Iterable<String> ids = call.getArgument(0);
            for (String user : ids) {
                result.add(new nuri.business.service.user.dto.UserSearchDto(user, user, "합성 부서", FINAL.equals(user)));
            }
            return result;
        });

        authenticate(OWNER);
        long id = service.registerInformalSanction(document(measurementTitle + " 차수 1", "합성 초기 본문 1"),
                List.of(stage(ApprovalStageKind.APPROVAL, previous.getFirst())));
        ownDocuments.add(id);
        // Each historical cycle is produced through the service: ASK, ANSWER, REVISE, reject, resubmit.
        for (int index = 0; index < previous.size(); index++) {
            String former = previous.get(index);
            int cycle = index + 1;
            authenticate(former);
            service.requestSupplement(id, ("과거 합성 질문 " + cycle + " ").repeat(80),
                    service.getInformalSanction(id, former).getVersion());
            authenticate(OWNER);
            service.answerSupplement(id, ("과거 합성 답변 " + cycle + " ").repeat(80), "합성 보완 본문 " + cycle,
                    service.getInformalSanction(id, OWNER).getVersion());
            authenticate(former);
            service.confirmInformalSanction(id, "R", "합성 반려 " + cycle,
                    service.getInformalSanction(id, former).getVersion());
            authenticate(OWNER);
            boolean last = index == previous.size() - 1;
            List<ApprovalStageRequest> next = last
                    ? List.of(stage(ApprovalStageKind.AGREEMENT, FIRST), stage(ApprovalStageKind.APPROVAL, FINAL))
                    : List.of(stage(ApprovalStageKind.APPROVAL, previous.get(index + 1)));
            service.resubmitInformalSanction(id, document(measurementTitle + " 차수 " + (cycle + 1), "합성 초기 본문 " + (cycle + 1)),
                    service.getInformalSanction(id, OWNER).getVersion(), next, last ? List.of(REFERENCE) : List.of());
        }

        // Preserve ordering-sensitive current-cycle semantics as well: an answered ASK, then an open ASK and REMIND.
        authenticate(FIRST);
        service.requestSupplement(id, "현재 닫힐 요청", service.getInformalSanction(id, FIRST).getVersion());
        authenticate(OWNER);
        service.answerSupplement(id, "현재 첫 요청 답변", null, service.getInformalSanction(id, OWNER).getVersion());
        assertThat(service.getInformalSanction(id, OWNER).getOpenSupplement()).isNull();
        authenticate(FIRST);
        service.requestSupplement(id, "현재 열린 요청", service.getInformalSanction(id, FIRST).getVersion());
        authenticate(OWNER);
        assertThat(service.remindApprovers(id)).isEqualTo(1);

        // Independent JDBC aggregates describe persisted synthetic rows; no repository under test supplies the budget.
        ProcessBudget current = processBudget(id, true);
        ProcessBudget all = processBudget(id, false);
        assertThat(current.rows()).isEqualTo(4);
        assertThat(all.rows()).isEqualTo(previous.size() * 3L + current.rows());
        assertThat(all.contentBytes()).isGreaterThan(current.contentBytes());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_hstry WHERE ifml_atrz_sn=? AND aprv_yn='R'",
                Long.class, id)).isEqualTo((long) previous.size());

        // Capture every role before any cost assertion, so the first cost failure cannot hide the other samples.
        List<MeasuredApprovalList> samples = List.of(
                measureApprovalList("submitted", OWNER, id,
                        () -> service.getInformalSanctionList(OWNER, measurementFilter, PageRequest.of(0, 20))),
                measureApprovalList("pending", FIRST, id,
                        () -> service.getPendingApprovalList(FIRST, measurementFilter, PageRequest.of(0, 20))),
                measureApprovalList("referenced", REFERENCE, id,
                        () -> service.getReferencedApprovalList(REFERENCE,
                                measurementFilter, PageRequest.of(0, 20))),
                measureApprovalList("processed", previous.getFirst(), id,
                        () -> service.getProcessedApprovalList(previous.getFirst(), measurementFilter, PageRequest.of(0, 20))));
        for (MeasuredApprovalList sample : samples) {
            reporter.publishEntry(sample.role(), "observedCalls=" + sample.read().calls + "; returnedRows=" + sample.read().rows
                    + "; returnedContentUtf8Bytes=" + sample.read().contentBytes
                    + "; currentRows=" + current.rows() + "; currentContentUtf8Bytes=" + current.contentBytes()
                    + "; allRows=" + all.rows() + "; allContentUtf8Bytes=" + all.contentBytes()
                    + "; mockNameLookupDistinctIds=" + sample.names().size()
                    + "; mockProfileLookupDistinctIds=" + sample.profiles().size());
            assertThat(sample.read().calls).as(sample.role() + " actual process query observed before cost assertions").isEqualTo(1);
            assertThat(sample.row()).as(sample.role() + " list fields and hints match the real participant detail")
                    .usingRecursiveComparison().ignoringFields("history", "processHistory", "references", "remindedToday", "canRemind")
                    .isEqualTo(sample.detail());
            assertThat(sample.row().getHistory()).isEmpty();
            assertThat(sample.row().getProcessHistory()).isEmpty();
            assertThat(sample.row().getReferences()).isEmpty();
        }

        InformalSanctionDto owner = samples.get(0).row();
        assertThat(owner.getAtrzCycl()).isEqualTo(4);
        assertThat(owner.getDocTtl()).isEqualTo(measurementTitle + " 차수 4");
        assertThat(owner.getDocCn()).isEqualTo("합성 초기 본문 4");
        assertThat(owner.getCurrentStageSince()).isNotNull();
        assertThat(owner.getOpenSupplement().askedBy()).isEqualTo(FIRST);
        assertThat(owner.getOpenSupplement().askedByNm()).isEqualTo(FIRST);
        assertThat(owner.getOpenSupplement().question()).isEqualTo("현재 열린 요청");
        assertThat(owner.isCanAnswerSupplement()).isTrue();
        java.time.LocalDate reminderDay = samples.get(0).detail().getProcessHistory().stream()
                .filter(p -> p.type() == nuri.business.domain.informalsanction.ApprovalProcessType.REMIND)
                .findFirst().orElseThrow().at().atZone(java.time.ZoneId.systemDefault())
                .withZoneSameInstant(java.time.ZoneId.of("Asia/Seoul")).toLocalDate();
        for (MeasuredApprovalList sample : samples) {
            if ("submitted".equals(sample.role())) {
                assertReminderHints(sample.detail(), reminderDay, sample.detailStart(), sample.detailEnd());
                assertReminderHints(sample.row(), reminderDay, sample.listStart(), sample.listEnd());
            } else {
                assertThat(sample.row().isRemindedToday()).isFalse();
                assertThat(sample.row().isCanRemind()).isFalse();
                assertThat(sample.detail().isRemindedToday()).isFalse();
                assertThat(sample.detail().isCanRemind()).isFalse();
            }
        }
        assertThat(owner.isCanReplaceApprover()).isTrue();
        assertThat(owner.isCanWithdraw()).isTrue();
        assertThat(owner.getStages().get(1).approvers().getFirst().absent()).isTrue();
        InformalSanctionDto approver = samples.get(1).row();
        assertThat(approver.isCanApprove()).isTrue();
        assertThat(approver.isCanRequestSupplement()).isFalse();
        assertThat(approver.isCanAnswerSupplement()).isFalse();
        assertThat(approver.isCanAddReference()).isFalse();
        InformalSanctionDto reference = samples.get(2).row();
        assertThat(reference.isReferenceViewer()).isTrue();
        assertReadOnlyHints(reference);
        assertThat(reference.getCurrentStageSince()).isNotNull();
        assertThat(reference.getOpenSupplement()).isEqualTo(owner.getOpenSupplement());
        InformalSanctionDto past = samples.get(3).row();
        assertThat(past.getAtrzCycl()).isEqualTo(1);
        assertThat(past.getAprvYn()).isEqualTo("R");
        assertThat(past.getDocTtl()).isEqualTo(measurementTitle + " 차수 1");
        assertThat(past.getDocCn()).isEqualTo("합성 보완 본문 1");
        assertThat(past.getVersion()).isNull();
        assertThat(past.getCurrentStageSince()).isNull();
        assertThat(past.getOpenSupplement()).isNull();
        assertThat(past.isReferenceViewer()).isFalse();
        assertReadOnlyHints(past);
        assertThat(past.getStages()).flatExtracting(s -> s.approvers())
                .extracting(a -> a.userId()).containsExactly(previous.getFirst());

        // Detail still loads and returns permitted history, independently of the list-only cost boundary.
        for (int index : List.of(0, 2)) {
            InformalSanctionDto detail = samples.get(index).detail();
            assertThat(detail.getHistory()).extracting(h -> h.atrzCycl()).containsExactly(4, 3, 2, 1);
            assertThat(detail.getProcessHistory()).hasSize((int) all.rows());
            assertThat(detail.getProcessHistory()).extracting(p -> p.atrzCycl()).contains(1, 2, 3, 4);
            assertThat(detail.getReferences()).extracting(r -> r.userId()).containsExactly(REFERENCE);
        }
        assertThat(samples.get(1).detail().getProcessHistory()).hasSize((int) current.rows())
                .allSatisfy(p -> assertThat(p.atrzCycl()).isEqualTo(4));
        assertThat(samples.get(3).detail().getHistory()).extracting(h -> h.atrzCycl()).containsExactly(1);
        assertThat(samples.get(3).detail().getProcessHistory()).hasSize(3)
                .allSatisfy(p -> assertThat(p.atrzCycl()).isEqualTo(1));
        assertThat(samples.get(3).detail().getReferences()).isEmpty();

        // The original full-history list query must fail here; no method-name assertion selects the implementation.
        org.assertj.core.api.SoftAssertions.assertSoftly(soft -> {
            for (MeasuredApprovalList sample : samples) {
                boolean pastParticipant = "processed".equals(sample.role());
                if (pastParticipant) {
                    // This actor needs no current-cycle processing data; a later zero-row optimization is valid.
                    soft.assertThat(sample.read().rows).as(sample.role() + " process row upper bound")
                            .isBetween(0L, current.rows());
                    soft.assertThat(sample.read().contentBytes).as(sample.role() + " prcsCn UTF-8 byte upper bound")
                            .isBetween(0L, current.contentBytes());
                    soft.assertThat(sample.read().cycles).as(sample.role() + " no historical process overfetch")
                            .isSubsetOf(4);
                    soft.assertThat(sample.names()).as("past participant required visible names")
                            .contains(OWNER, previous.getFirst());
                    soft.assertThat(sample.names()).as("past participant bounded names; current actor is optional")
                            .isSubsetOf(OWNER, previous.getFirst(), FIRST);
                } else {
                    soft.assertThat(sample.read().rows).as(sample.role() + " materialized process rows")
                            .isEqualTo(current.rows());
                    soft.assertThat(sample.read().contentBytes).as(sample.role() + " materialized prcsCn UTF-8 bytes")
                            .isEqualTo(current.contentBytes());
                    soft.assertThat(sample.read().cycles).as(sample.role() + " process cycles materialized")
                            .containsExactly(4);
                    soft.assertThat(sample.names()).as(sample.role() + " mock name lookup ID population, not SQL cost")
                            .containsExactlyInAnyOrder(OWNER, FIRST, FINAL);
                }
                java.util.Set<String> expectedProfiles = pastParticipant
                        ? java.util.Set.of(previous.getFirst()) : java.util.Set.of(FIRST, FINAL);
                soft.assertThat(sample.profiles()).as(sample.role() + " mock absence lookup ID population, not SQL cost")
                        .containsExactlyInAnyOrderElementsOf(expectedProfiles);
            }
        });
    }

    private static java.time.LocalDate businessDate() {
        return java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
    }

    private static void assertReminderHints(InformalSanctionDto row, java.time.LocalDate reminderDay,
                                           java.time.LocalDate before, java.time.LocalDate after) {
        // If the request crosses midnight either date is valid; on ordinary requests this is an exact assertion.
        assertThat(row.isRemindedToday()).isIn(List.of(reminderDay.equals(before), reminderDay.equals(after)));
        assertThat(row.isCanRemind()).isEqualTo(!row.isRemindedToday());
    }
    private static void assertReadOnlyHints(InformalSanctionDto row) {
        assertThat(List.of(row.isCanApprove(), row.isCanWithdraw(), row.isCanResubmit(), row.isCanRemind(),
                row.isRemindedToday(), row.isCanReplaceApprover(), row.isCanRequestSupplement(),
                row.isCanAnswerSupplement(), row.isCanAddReference())).containsOnly(false);
    }

    private ProcessBudget processBudget(long id, boolean currentOnly) {
        return jdbc.queryForObject("SELECT count(*), coalesce(sum(octet_length(convert_to(coalesce(p.prcs_cn,''), 'UTF8'))),0) "
                        + "FROM tb_ifml_atrz_prcs_hstry p JOIN tb_ifml_atrz_info s ON s.ifml_atrz_sn=p.ifml_atrz_sn "
                        + "WHERE p.ifml_atrz_sn=?" + (currentOnly ? " AND p.atrz_cycl=s.atrz_cycl" : ""),
                (row, number) -> new ProcessBudget(row.getLong(1), row.getLong(2)), id);
    }

    private MeasuredApprovalList measureApprovalList(String role, String actor, long id,
            java.util.function.Supplier<org.springframework.data.domain.Page<InformalSanctionDto>> query) {
        authenticate(actor);
        java.time.LocalDate detailStart = businessDate();
        InformalSanctionDto detail = service.getInformalSanction(id, actor);
        java.time.LocalDate detailEnd = businessDate();
        org.mockito.Mockito.clearInvocations(users); // Preserve every existing stub; exclude fixture/detail lookups.
        ProcessRead read = processReadProbe.begin(id);
        java.time.LocalDate listStart = businessDate();
        java.time.LocalDate listEnd;
        InformalSanctionDto row;
        try {
            var page = query.get();
            listEnd = businessDate();
            var ownRows = page.getContent().stream().filter(item -> Long.valueOf(id).equals(item.getIfmlAtrzSn())).toList();
            assertThat(ownRows).as("the synthetic document is present once, independently of other documents").hasSize(1);
            row = ownRows.getFirst();
        } finally {
            processReadProbe.end();
        }
        return new MeasuredApprovalList(role, row, detail, read,
                lookupIds("findAllById"), lookupIds("findProfilesByEsntlIds"), detailStart, detailEnd, listStart, listEnd);
    }

    private java.util.Set<String> lookupIds(String method) {
        java.util.Set<String> ids = new java.util.HashSet<>();
        for (var invocation : org.mockito.Mockito.mockingDetails(users).getInvocations()) {
            if (method.equals(invocation.getMethod().getName())) {
                Iterable<String> requested = invocation.getArgument(0);
                requested.forEach(ids::add);
            }
        }
        return java.util.Set.copyOf(ids);
    }

    private record ProcessBudget(long rows, long contentBytes) { }
    private record MeasuredApprovalList(String role, InformalSanctionDto row, InformalSanctionDto detail,
                                        ProcessRead read, java.util.Set<String> names, java.util.Set<String> profiles,
                                        java.time.LocalDate detailStart, java.time.LocalDate detailEnd,
                                        java.time.LocalDate listStart, java.time.LocalDate listEnd) { }

    private static class ProcessRead {
        private final long documentId;
        private int calls;
        private long rows;
        private long contentBytes;
        private final java.util.Set<Integer> cycles = new java.util.HashSet<>();

        ProcessRead(long documentId) { this.documentId = documentId; }
    }

    /** Observe returned real entities only; leave query, transaction advice, ordering and result untouched. */
    @org.aspectj.lang.annotation.Aspect
    static class ProcessReadProbe {
        private final ThreadLocal<ProcessRead> active = new ThreadLocal<>();

        ProcessRead begin(long documentId) {
            assertThat(active.get()).as("measurement must not leak into another list read").isNull();
            ProcessRead read = new ProcessRead(documentId);
            active.set(read);
            return read;
        }

        void end() { active.remove(); }

        @org.aspectj.lang.annotation.Around("execution(java.util.List nuri.business.domain.informalsanction.InformalSanctionProcessRepository.*(..))")
        Object observeReturnedProcesses(org.aspectj.lang.ProceedingJoinPoint invocation) throws Throwable {
            Object result = invocation.proceed();
            ProcessRead read = active.get();
            if (read != null) {
                assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isCurrentTransactionReadOnly()).isTrue();
                read.calls++;
                for (Object item : (List<?>) result) {
                    var process = (nuri.business.domain.informalsanction.InformalSanctionProcess) item;
                    if (!Long.valueOf(read.documentId).equals(process.getIfmlAtrzSn())) continue;
                    read.rows++;
                    read.cycles.add(process.getAtrzCycl().intValueExact());
                    if (process.getPrcsCn() != null) {
                        read.contentBytes += process.getPrcsCn().getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
                    }
                }
            }
            return result;
        }
    }
    private void seedDrafter() {
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'draft fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",
                DRAFTER, DRAFTER.toLowerCase(java.util.Locale.ROOT));
        // 사용자 저장소는 이 클래스에서 목이다 — 잠금 조회는 실제 행이 있다는 것만 돌려준다(행 잠금 자체는 즐겨찾기 동시성 시험이 본다).
        when(users.findByEsntlIdForUpdate(DRAFTER)).thenReturn(java.util.Optional.of(
                User.builder().esntlId(DRAFTER).userId(DRAFTER).userNm(DRAFTER).userSttsCd("P").build()));
        when(users.findProfilesByEsntlIds(any())).thenAnswer(call -> {
            List<nuri.business.service.user.dto.UserSearchDto> result = new ArrayList<>();
            java.util.Collection<String> ids = call.getArgument(0);
            for (String id : ids) result.add(new nuri.business.service.user.dto.UserSearchDto(id, id, "부서", false));
            return result;
        });
    }

    private static nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest draftRequest(
            String title, List<ApprovalStageRequest> stages, Integer version) {
        return nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest.builder()
                .taskSeCd("WF").docTtl(title).stages(stages).version(version).build();
    }

    private static nuri.business.service.informalsanction.dto.ApprovalSavedLineRequest savedLineRequest(
            String name, List<ApprovalStageRequest> stages) {
        return nuri.business.service.informalsanction.dto.ApprovalSavedLineRequest.builder().aplnNm(name).stages(stages).build();
    }

    private int countApprovals() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_info WHERE aplcnt_id=?", Integer.class, DRAFTER);
    }

    private long createDocument(String title, String requestYmd) {
        authenticate(OWNER);
        long id = service.registerInformalSanction(InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("WF")
                .reqYmd(requestYmd).docTtl(title).docCn("내용").build(), List.of(stage(ApprovalStageKind.APPROVAL, FIRST)));
        ownDocuments.add(id);
        return id;
    }

    private long create(List<ApprovalStageRequest> stages) {
        authenticate(OWNER);
        long id = service.registerInformalSanction(document("검토 요청", "최초 문서 내용"), stages);
        ownDocuments.add(id);
        return id;
    }

    private InformalSanctionDto document(String title, String content) {
        return InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("WF").reqYmd("20260916")
                .docTtl(title).docCn(content).build();
    }

    private static ApprovalStageRequest stage(ApprovalStageKind kind, String... approvers) {
        return new ApprovalStageRequest(kind, List.of(approvers));
    }

    private static void authenticate(String id) {
        authenticate(id, id);
    }

    private static void authenticate(String id, String loginId) {
        var principal = CustomUserDetails.builder().userId(loginId).esntlId(id).enabled(true).build();
        // 처리·회수·재상신 힌트는 그 동작의 기능 권한도 본다 — 참여자는 결재 권한을 가진 일반 사용자다.
        var authorities = java.util.stream.Stream.of("APPROVAL_READ", "APPROVAL_CREATE", "APPROVAL_APPROVE", "APPROVAL_CANCEL")
                .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }

    /**
     * 알림 요청 리스너의 bean 정의를 걷는다. 이름에 TestConfig 를 둔다 — 앱의 컴포넌트 스캔은 이름이 .*TestConfig.* 인 클래스만
     * 거른다(ApiServerApplication). 이 규칙을 어기면 이 설정이 모든 시험 문맥에 스캔돼 다른 시험의 알림까지 사라진다.
     * 일반 BeanFactoryPostProcessor 는 컴포넌트 스캔(ConfigurationClassPostProcessor) 뒤에 돈다.
     */
    @TestConfiguration(proxyBeanMethods = false)
    @org.springframework.context.annotation.EnableAspectJAutoProxy
    static class InAppNotificationsOffTestConfiguration {
        @Bean
        ProcessReadProbe processReadProbe() { return new ProcessReadProbe(); }

        @Bean
        static BeanFactoryPostProcessor dropInAppNotificationListener() {
            return beanFactory -> {
                BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
                for (String name : registry.getBeanDefinitionNames()) {
                    if (IN_APP_NOTIFICATION_LISTENER.equals(registry.getBeanDefinition(name).getBeanClassName())) {
                        registry.removeBeanDefinition(name);
                    }
                }
            };
        }
    }
}
