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
    @Autowired private InformalSanctionService service;
    @Autowired private nuri.business.service.informalsanction.ApprovalTemporaryDraftService drafts;
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
    }

    @AfterEach
    void removeOnlyOwnDocuments() {
        SecurityContextHolder.clearContext();
        for (long id : ownDocuments) {
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
                List.of(stage(ApprovalStageKind.APPROVAL, FINAL)), sn, saved.version()))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> drafts.submitWithTemporaryDraft(document,
                List.of(stage(ApprovalStageKind.APPROVAL, "WF_NOPERM")), sn, lineOnly.version()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("결재 권한");
        assertThat(countApprovals()).isEqualTo(approvals);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).as("상신이 실패하면 임시저장과 결재선이 되살아난다").isEqualTo(1);

        long id = drafts.submitWithTemporaryDraft(document, List.of(stage(ApprovalStageKind.APPROVAL, FINAL)), sn,
                lineOnly.version());
        ownDocuments.add(id);
        assertThat(service.getInformalSanction(id, DRAFTER).getDocTtl()).isEqualTo("쓰다 만 기안(고침)");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=?",
                Integer.class, sn)).isZero();
        assertThatThrownBy(() -> drafts.submitWithTemporaryDraft(document, List.of(stage(ApprovalStageKind.APPROVAL, FINAL)),
                sn, lineOnly.version())).as("같은 임시저장으로 두 번 올리지 않는다").isInstanceOf(BusinessException.class)
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
