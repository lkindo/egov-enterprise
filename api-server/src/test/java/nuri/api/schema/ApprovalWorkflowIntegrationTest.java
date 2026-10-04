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
import nuri.business.service.notification.listener.NotificationRequestListener;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

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

/** Real Flyway, PostgreSQL transactions and repositories; external notification handlers are inert. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
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
    @Autowired private InformalSanctionService service;
    @Autowired private nuri.business.service.informalsanction.ApprovalTemporaryDraftService drafts;
    @Autowired private nuri.api.controller.business.approval.InformalSanctionApiController legacyController;
    /** 알림 리스너는 이 클래스에서 목이다 — 실제 알림 행(사용자 FK)을 보는 시험만 이 서비스로 넘긴다. */
    @Autowired private nuri.business.service.notification.NotificationService notificationService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @MockitoBean private UserRepository users;
    @MockitoBean private CommonCodeService codes;
    @MockitoBean private SanctionEventListener finalNotifications;
    @MockitoBean private NotificationRequestListener inAppNotifications;
    private final List<Long> ownDocuments = new ArrayList<>();

    @BeforeEach
    void availableParticipants() {
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
        var received = service.getReceivedInformalSanctionList(FIRST, PageRequest.of(0, 10));
        var processed = service.getProcessedApprovalList(FIRST, PageRequest.of(0, 10));
        for (var page : List.of(received, processed)) {
            assertThat(page.getContent()).anySatisfy(document -> {
                assertThat(document.getIfmlAtrzSn()).isEqualTo(id);
                assertThat(document.getDocCn()).isEqualTo("최초 문서 내용");
                assertThat(document.getAtrzCycl()).isEqualTo(1);
                assertThat(document.getVersion()).isNull();
            });
        }
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
     * 레거시 경로(/informal-sanctions/{id})도 같은 관문이라 참조자가 읽는다.
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

        // 레거시 경로의 라우트 권한(INFORMAL_READ)을 가진 참조자 — 문서 열람은 같은 서비스 관문이 판정한다.
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal(REFERENCE),
                null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("INFORMAL_READ"))));
        var legacy = legacyController.getInformalSanction(principal(REFERENCE), id).getBody();
        assertThat(legacy).isNotNull();
        assertThat(legacy.data().getIfmlAtrzSn()).as("레거시 상세 경로도 같은 관문이다").isEqualTo(id);

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
     * [2026-10-04 D4 개정 1] 지워진 참조자 때문에 결재가 되돌아가지 않는다. 참조 행은 사용자 삭제 뒤에도 남는데(사용자 FK 없음)
     * 알림 행(tb_user_noti)은 사용자 FK 가 있고 업무 트랜잭션 안에서 저장된다 — 지워진 참조자에게 결과 알림을 보내면 FK 위반으로
     * 승인 전체가 되돌아간다. 이 시험만 실제 알림 서비스로 알림 행을 쓴다(나머지 시험의 결재자·참조자는 사용자 행이 없다).
     */
    @Test
    void approvalSucceedsWhenACurrentCycleReferenceAccountWasDeletedOnPostgres() {
        String fixture = "WFN" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String approver = fixture + "A";
        String kept = fixture + "K";
        String deleted = fixture + "D";
        List<String> people = List.of(approver, kept, deleted);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conname='fk_tb_user_noti_tb_user_info'",
                Integer.class)).as("알림 행은 사용자 FK 로 묶여 있다 — 없으면 이 시험은 아무것도 증명하지 않는다").isEqualTo(1);
        try {
            for (String person : people) {
                jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                        + "VALUES(?,?,'reference fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",
                        person, person.toLowerCase(java.util.Locale.ROOT));
            }
            // 사용자 저장소는 이 클래스에서 목이다 — 이 시험에서는 실제 사용자 행이 있는 사람만 돌려준다(지운 사람은 없다).
            //   doAnswer 로 바꿔 단다 — when(users.findAllById(any())) 는 다는 순간 목을 null 인자로 한 번 불러, @BeforeEach 의
            //   응답이 null 을 순회하다 NPE 로 죽는다.
            org.mockito.Mockito.doAnswer(call -> {
                List<User> result = new ArrayList<>();
                Iterable<String> ids = call.getArgument(0);
                for (String id : ids) {
                    Integer rows = jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?", Integer.class, id);
                    if (rows != null && rows > 0) {
                        result.add(User.builder().esntlId(id).userId(id).userNm(id).userSttsCd("P").build());
                    }
                }
                return result;
            }).when(users).findAllById(any());
            when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(approver));
            when(users.findActiveEsntlIdsHoldingPermission("APPROVAL_READ")).thenReturn(people);
            org.mockito.Mockito.doAnswer(call -> notificationService.createForEvent(call.getArgument(0)))
                    .when(inAppNotifications).onNotificationRequested(any());

            authenticate(OWNER);
            long id = service.registerInformalSanction(document("검토 요청", "지워질 참조자가 있는 기안"),
                    List.of(stage(ApprovalStageKind.APPROVAL, approver)), List.of(kept, deleted));
            ownDocuments.add(id);
            assertThat(notificationCount(deleted)).as("지정 알림이 실제 알림 행으로 저장된다(리스너가 실제로 불린다)").isEqualTo(1);

            jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", deleted);
            jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", deleted);
            assertThat(jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", deleted)).isEqualTo(1);

            authenticate(approver);
            service.confirmInformalSanction(id, "C", null, service.getInformalSanction(id, approver).getVersion());

            assertThat(jdbc.queryForObject("SELECT aprv_yn FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=?", String.class, id))
                    .as("지워진 참조자가 있어도 승인이 커밋된다").isEqualTo("C");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=? AND noti_ttl_nm=?",
                    Integer.class, kept, "결재가 완료되었습니다")).as("남은 참조자는 결과 알림을 받는다").isEqualTo(1);
            assertThat(notificationCount(deleted)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=? AND user_id=?",
                    Integer.class, id, deleted)).as("참조 행은 문서 기록으로 남는다").isEqualTo(1);
        } finally {
            for (String person : people) {
                jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm='NOTIFICATION_DELIVERY' AND job_cn::jsonb->>'receiver'=?", person);
                jdbc.update("DELETE FROM tb_user_noti WHERE rcvr_id=?", person);
                jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", person);
            }
        }
    }

    private int notificationCount(String receiver) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_noti WHERE rcvr_id=?", Integer.class, receiver);
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

    private static CustomUserDetails principal(String id) {
        return CustomUserDetails.builder().userId(id).esntlId(id).enabled(true).build();
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
}
