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
    @Autowired private InformalSanctionService service;
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
    }

    @AfterEach
    void removeOnlyOwnDocuments() {
        SecurityContextHolder.clearContext();
        for (long id : ownDocuments) {
            jdbc.update("DELETE FROM tb_ifml_atrz_dtl WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_hstry WHERE ifml_atrz_sn=?", id);
            jdbc.update("DELETE FROM tb_ifml_atrz_info WHERE ifml_atrz_sn=?", id);
        }
        ownDocuments.clear();
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

        authenticate(FIRST);
        assertThat(service.getPendingApprovalList(FIRST, nuri.business.service.informalsanction.ApprovalListFilter.of(
                "할인 1000", null, null, null), PageRequest.of(0, 50)).getContent())
                .extracting(InformalSanctionDto::getIfmlAtrzSn).containsExactly(other);
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
        var principal = CustomUserDetails.builder().userId(id).esntlId(id).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
