package nuri.business.service.informalsanction;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailId;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl;
import nuri.business.service.informalsanction.event.SanctionStatusChangedEvent;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("다단계 결재 처리·권한·차수·동기 알림 의도 계약")
class InformalSanctionWorkflowServiceTest {
    @Mock private InformalSanctionRepository informalSanctionRepository;
    @Mock private InformalSanctionDetailRepository detailRepository;
    @Mock private InformalSanctionHistoryRepository historyRepository;
    @Mock private CommonCodeService commonCodeService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;
    @Spy private InformalSanctionMapper informalSanctionMapper = new InformalSanctionMapperImpl();
    @InjectMocks private InformalSanctionService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        actor("owner");
        // 기본은 결재 기능 권한을 모두 가진 사용자다. 권한이 빠진 경우는 해당 테스트가 따로 정한다.
        permissions("APPROVAL_APPROVE", "APPROVAL_CANCEL", "APPROVAL_CREATE");
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        security.close();
    }

    private void actor(String userId) {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));
    }

    private void permissions(String... held) {
        java.util.Set<String> granted = java.util.Set.of(held);
        security.when(() -> SecurityUtil.hasPermission(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(invocation -> granted.contains(invocation.<String>getArgument(0)));
    }

    private InformalSanction header(String status) {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L)
                .aplcntId("owner").aprvrId("first").taskSeCd("TASK").reqYmd("20260916")
                .docTtl("원래 제목").docCn("원래 본문").aprvYn(status).build();
        ReflectionTestUtils.setField(document, "version", 0);
        return document;
    }

    private InformalSanctionDetail line(int cycle, int order, String userId, boolean active) {
        return InformalSanctionDetail.create(new InformalSanctionDetailId(
                7L, BigDecimal.valueOf(cycle), BigDecimal.valueOf(order), userId),
                order == 1 ? ApprovalStageKind.APPROVAL : ApprovalStageKind.AGREEMENT, active);
    }

    private InformalSanctionHistory writable(InformalSanction document, List<InformalSanctionDetail> lines) {
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, document.getAtrzCycl())).willReturn(lines);
        InformalSanctionHistory history = InformalSanctionHistory.create(document);
        given(historyRepository.findById(new InformalSanctionHistoryId(7L, document.getAtrzCycl())))
                .willReturn(Optional.of(history));
        return history;
    }

    private InformalSanctionDto draft() {
        return InformalSanctionDto.builder().taskSeCd("TASK").aplcntId("owner")
                .reqYmd("20260917").docTtl("새 제목").docCn("새 본문").build();
    }

    private ApprovalStageRequest stage(ApprovalStageKind kind, String... users) {
        return new ApprovalStageRequest(kind, List.of(users));
    }

    private void activeUsers(String... userIds) {
        given(userRepository.findAllById(any())).willReturn(java.util.Arrays.stream(userIds)
                .map(userId -> User.builder().esntlId(userId).userId(userId).userNm(userId)
                        .pswd("{bcrypt}x").userSttsCd("P").build()).toList());
        // 결재선 검증은 결재자의 결재 권한(APPROVAL_APPROVE)도 본다 — 기본은 모두 가진 것으로 둔다.
        org.mockito.Mockito.lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE"))
                .thenReturn(List.of(userIds));
    }

    private void knownTask() {
        given(commonCodeService.getCodesByGroup("COM075"))
                .willReturn(List.of(new CommonCodeDto("COM075", "TASK", "검증 업무", null, "Y")));
    }

    private <T> List<T> events(Class<T> type) {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeast(0)).publishEvent(captor.capture());
        return captor.getAllValues().stream().filter(type::isInstance).map(type::cast).toList();
    }

    @Test
    @DisplayName("앞 단계 승인 후 다음 단계가 활성화되고 마지막 승인 후에만 문서가 완료된다")
    void sequentialStagesFinishOnlyAfterLastDecision() {
        InformalSanction document = header("A");
        InformalSanctionDetail first = line(1, 1, "first", true);
        InformalSanctionDetail second = line(1, 2, "second", false);
        writable(document, List.of(first, second));
        actor("first");

        service.confirmInformalSanction(7L, "C", "첫 승인", 0);

        assertThat(document.getAprvYn()).isEqualTo("A");
        assertThat(document.getAprvrId()).isEqualTo("second");
        assertThat(first.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(second.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("second");
        assertThat(events(SanctionStatusChangedEvent.class)).isEmpty();
        actor("second");

        service.confirmInformalSanction(7L, "C", "최종 승인", 0);

        assertThat(document.getAprvYn()).isEqualTo("C");
        assertThat(second.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(events(SanctionStatusChangedEvent.class)).hasSize(1);
        assertThat(events(SanctionStatusChangedEvent.class).get(0).getSanctionerId()).isEqualTo("second");
    }

    @Test
    @DisplayName("병렬 단계 전원이 승인해야 이동하며 대표 결재자가 그대로여도 version 증가를 요청한다")
    void parallelStageRequiresEveryoneAndIncrementsVersionForPartialDecision() {
        InformalSanction document = header("A");
        InformalSanctionDetail first = line(1, 1, "first", true);
        InformalSanctionDetail peer = line(1, 1, "peer", true);
        InformalSanctionDetail next = line(1, 2, "next", false);
        writable(document, List.of(first, peer, next));
        actor("peer");

        service.confirmInformalSanction(7L, "C", null, 0);

        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(peer.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(next.status()).isEqualTo(ApprovalStatus.WAITING);
        assertThat(document.getAprvYn()).isEqualTo("A");
        assertThat(document.getAprvrId()).isEqualTo("first");
        verify(entityManager).lock(document, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        verifyNoInteractions(eventPublisher);
        actor("first");

        service.confirmInformalSanction(7L, "C", null, 0);

        assertThat(next.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("next");
        assertThat(document.getAprvYn()).isEqualTo("A");
    }

    @Test
    @DisplayName("현재 단계 반려는 문서를 R로 만들고 나머지 미처리 라인을 취소한다")
    void rejectionCancelsPeersAndLaterStages() {
        InformalSanction document = header("A");
        InformalSanctionDetail first = line(1, 1, "first", true);
        InformalSanctionDetail peer = line(1, 1, "peer", true);
        InformalSanctionDetail next = line(1, 2, "next", false);
        InformalSanctionHistory history = writable(document, List.of(first, peer, next));
        actor("first");

        service.confirmInformalSanction(7L, "R", "보완 필요", 0);

        assertThat(document.getAprvYn()).isEqualTo("R");
        assertThat(first.status()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(peer.status()).isEqualTo(ApprovalStatus.CANCELLED);
        assertThat(next.status()).isEqualTo(ApprovalStatus.CANCELLED);
        assertThat(history.getAprvYn()).isEqualTo("R");
        assertThat(history.getRjctRsnCn()).isEqualTo("보완 필요");
        // [2026-10-01] 같은 차례였던 다른 결재자에게 알린다 — 알리지 않으면 대기함에서 문서가 이유 없이 사라진다.
        //   아직 차례가 오지 않았던 다음 단계(next)와 반려한 본인에게는 알리지 않는다.
        assertThat(events(NotificationRequestedEvent.class)).singleElement().satisfies(notification -> {
            assertThat(notification.receiverEsntlId()).isEqualTo("peer");
            assertThat(notification.title()).isEqualTo("결재가 반려되었습니다");
            assertThat(notification.content()).contains("「원래 제목」", "번호 7", "다른 결재자가 반려했습니다");
            assertThat(notification.linkUrl()).isEqualTo("/approvals");
        });
        assertThat(events(SanctionStatusChangedEvent.class)).singleElement()
                .satisfies(event -> assertThat(event.getDocumentTitle()).isEqualTo("원래 제목"));
    }

    /*
     * [2026-10-01] 이미 끝난 문서·이미 처리한 라인을 누른 것은 입력 오류가 아니라 먼저 일어난 처리와의 충돌이다.
     * 종전에는 사유 없는 400(잘못된 상태 전이)이라 무슨 일이 있었는지 알 수 없었고, 화면도 충돌 흐름으로 가지 못했다.
     */
    @ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "R, 이미 반려된 결재입니다",
            "W, 신청자가 회수한 결재입니다",
            "C, 이미 승인이 끝난 결재입니다",
    })
    @DisplayName("이미 끝난 문서를 처리하면 무슨 일이 있었는지 밝혀 409 로 거부한다")
    void decidingFinishedDocumentExplainsWhatHappened(String status, String reason) {
        InformalSanction document = header(status);
        InformalSanctionDetail own = line(1, 1, "first", true);
        own.cancel();
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, document.getAtrzCycl())).willReturn(List.of(own));
        actor("first");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    assertThat(exception.getMessage()).contains(reason, "최신 상태를 확인해 주세요");
                });
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("다른 탭에서 이미 처리한 라인을 다시 처리하면 409 로, 차례가 오지 않은 라인은 403 으로 사유를 말한다")
    void decidingOwnDecidedOrWaitingLineExplainsWhy() {
        InformalSanction document = header("A");
        InformalSanctionDetail decided = line(1, 1, "first", true);
        decided.decide(true, null, LocalDateTime.of(2026, 9, 16, 10, 0));
        InformalSanctionDetail peer = line(1, 1, "peer", true);
        InformalSanctionDetail waiting = line(1, 2, "next", false);
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, document.getAtrzCycl())).willReturn(List.of(decided, peer, waiting));

        actor("first");
        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    assertThat(exception.getMessage()).contains("이미 처리한 결재입니다");
                });

        actor("next");
        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
                    assertThat(exception.getMessage()).contains("아직 결재 차례가 아닙니다");
                });
        assertThat(peer.status()).isEqualTo(ApprovalStatus.ACTIVE);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("이미 끝난 문서의 회수와, 진행 중인 문서의 재상신은 409 로 사유를 말한다")
    void withdrawingOrResubmittingInWrongStateExplainsWhy() {
        InformalSanction approved = header("C");
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(approved));
        assertThatThrownBy(() -> service.deleteInformalSanction(7L, 0))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    assertThat(exception.getMessage()).contains("이미 승인이 끝난 결재입니다", "회수할 수 없습니다");
                });

        InformalSanction inProgress = header("A");
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(inProgress));
        assertThatThrownBy(() -> service.resubmitInformalSanction(7L, draft(), 0,
                List.of(stage(ApprovalStageKind.APPROVAL, "second"))))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    assertThat(exception.getMessage()).contains("반려되었거나 회수한 결재만 다시 올릴 수 있습니다");
                });
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("결재 권한이 없는 사용자를 결재자로 지정하면 이름을 밝혀 거부한다 — 그 단계에서 문서가 멈추지 않게 한다")
    void approverWithoutApprovePermissionIsRejectedByName() {
        knownTask();
        activeUsers("second", "next");
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of("second"));

        assertThatThrownBy(() -> service.registerInformalSanction(draft(), List.of(
                stage(ApprovalStageKind.AGREEMENT, "second"), stage(ApprovalStageKind.APPROVAL, "next"))))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                    assertThat(exception.getMessage()).isEqualTo("결재 권한이 없는 사용자는 결재자로 지정할 수 없습니다: next");
                });
        verify(informalSanctionRepository, never()).save(any(InformalSanction.class));
    }

    @Test
    @DisplayName("처리·회수·재상신 힌트는 참여 조건뿐 아니라 그 동작의 기능 권한도 본다")
    void hintsRequireOperationPermission() {
        var pageable = PageRequest.of(0, 10);
        InformalSanction inProgress = header("A");
        given(informalSanctionRepository.findByAprvrId("first", pageable))
                .willReturn(new PageImpl<>(List.of(inProgress), pageable, 1));
        given(detailRepository.findVisibleForDocuments(List.of(7L), "first")).willReturn(List.of(line(1, 1, "first", true)));
        given(historyRepository.findVisibleForDocuments(List.of(7L), "first"))
                .willReturn(List.of(InformalSanctionHistory.create(inProgress)));
        knownTask();
        activeUsers("owner", "first");
        actor("first");

        permissions("APPROVAL_CANCEL", "APPROVAL_CREATE");
        assertThat(service.getReceivedInformalSanctionList("first", pageable).getContent().get(0).isCanApprove()).isFalse();
        permissions("APPROVAL_APPROVE");
        assertThat(service.getReceivedInformalSanctionList("first", pageable).getContent().get(0).isCanApprove()).isTrue();

        given(informalSanctionRepository.findSubmitted("owner", null, null, null, null, pageable))
                .willReturn(new PageImpl<>(List.of(inProgress), pageable, 1));
        given(detailRepository.findVisibleForDocuments(List.of(7L), "owner")).willReturn(List.of(line(1, 1, "first", true)));
        given(historyRepository.findVisibleForDocuments(List.of(7L), "owner"))
                .willReturn(List.of(InformalSanctionHistory.create(inProgress)));
        actor("owner");
        assertThat(service.getInformalSanctionList("owner", pageable).getContent().get(0).isCanWithdraw()).isFalse();
        permissions("APPROVAL_CANCEL");
        assertThat(service.getInformalSanctionList("owner", pageable).getContent().get(0).isCanWithdraw()).isTrue();
    }

    @Test
    @DisplayName("신청자 회수는 기결정 라인을 보존하고 미처리 라인만 취소하며 행을 삭제하지 않는다")
    void withdrawalPreservesDecisionsAndCancelsRemainingLines() {
        InformalSanction document = header("A");
        InformalSanctionDetail decided = line(1, 1, "first", true);
        decided.decide(true, "원래 의견", LocalDateTime.of(2026, 9, 16, 10, 0));
        InformalSanctionDetail peer = line(1, 1, "peer", true);
        InformalSanctionDetail next = line(1, 2, "next", false);
        InformalSanctionHistory history = writable(document, List.of(decided, peer, next));

        service.deleteInformalSanction(7L, 0);

        assertThat(document.getAprvYn()).isEqualTo("W");
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(decided.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(decided.getAtrzOpnnCn()).isEqualTo("원래 의견");
        assertThat(peer.status()).isEqualTo(ApprovalStatus.CANCELLED);
        assertThat(next.status()).isEqualTo(ApprovalStatus.CANCELLED);
        assertThat(history.getAprvYn()).isEqualTo("W");
        verify(informalSanctionRepository, never()).delete(any(InformalSanction.class));
        verify(detailRepository, never()).deleteAll(anyIterable());
    }

    @ParameterizedTest
    @ValueSource(strings = {"R", "W"})
    @DisplayName("재상신은 이전 차수 내용을 보존하고 새 차수의 결재선을 생성한다")
    void resubmissionCreatesNewRevisionWithoutReplacingHistory(String status) {
        InformalSanction document = header(status);
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        InformalSanctionHistory previous = InformalSanctionHistory.create(document);
        given(historyRepository.findById(new InformalSanctionHistoryId(7L, BigDecimal.ONE)))
                .willReturn(Optional.of(previous));
        knownTask();
        activeUsers("second", "next");

        service.resubmitInformalSanction(7L, draft(), 0, List.of(
                stage(ApprovalStageKind.AGREEMENT, "second"), stage(ApprovalStageKind.APPROVAL, "next")));

        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(document.getAprvYn()).isEqualTo("A");
        assertThat(document.getDocCn()).isEqualTo("새 본문");
        assertThat(previous.getDocCn()).isEqualTo("원래 본문");
        assertThat(previous.getAprvYn()).isEqualTo(status);
        ArgumentCaptor<InformalSanctionHistory> historyCaptor = ArgumentCaptor.forClass(InformalSanctionHistory.class);
        verify(historyRepository).saveAndFlush(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getId().getAtrzCycl()).isEqualByComparingTo(BigDecimal.valueOf(2));
        ArgumentCaptor<Iterable<InformalSanctionDetail>> linesCaptor = ArgumentCaptor.captor();
        verify(detailRepository).saveAll(linesCaptor.capture());
        assertThat(linesCaptor.getValue()).allSatisfy(detail ->
                assertThat(detail.getId().getAtrzCycl()).isEqualByComparingTo(BigDecimal.valueOf(2)));
        assertThat(linesCaptor.getValue()).extracting(InformalSanctionDetail::status)
                .containsExactly(ApprovalStatus.ACTIVE, ApprovalStatus.WAITING);
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("second");
    }

    @Test
    @DisplayName("미래 단계 참여자는 현재 문서를 승인할 수 없다")
    void futureStageParticipantCannotDecide() {
        InformalSanction document = header("A");
        InformalSanctionDetail first = line(1, 1, "first", true);
        InformalSanctionDetail next = line(1, 2, "next", false);
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, BigDecimal.ONE)).willReturn(List.of(first, next));
        actor("next");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0))
                .isInstanceOf(BusinessException.class);
        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(next.status()).isEqualTo(ApprovalStatus.WAITING);
        assertThat(document.getAprvYn()).isEqualTo("A");
        verifyNoInteractions(eventPublisher, historyRepository, entityManager);
    }

    @Test
    @DisplayName("참여자가 보낸 오래된 version의 결정 요청은 라인 변경·알림 전에 거절한다")
    void staleVersionCannotChangeDocumentOrLines() {
        InformalSanction document = header("A");
        ReflectionTestUtils.setField(document, "version", 2);
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        InformalSanctionDetail first = line(1, 1, "first", true);
        given(detailRepository.findRevision(7L, BigDecimal.ONE)).willReturn(List.of(first));
        actor("first");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 1))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(document.getAprvYn()).isEqualTo("A");
        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(first.getAtrzDt()).isNull();
        verifyNoInteractions(historyRepository, eventPublisher, entityManager);
    }

    @Test
    @DisplayName("이미 처리한 라인의 재요청은 결정을 덮어쓰거나 알림을 다시 만들지 않는다")
    void repeatedDecisionCannotOverwriteOpinionOrPublishAgain() {
        InformalSanction document = header("A");
        InformalSanctionDetail first = line(1, 1, "first", true);
        InformalSanctionDetail peer = line(1, 1, "peer", true);
        writable(document, List.of(first, peer));
        actor("first");
        service.confirmInformalSanction(7L, "C", "첫 의견", 0);
        clearInvocations(eventPublisher);

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", "다른 의견", 0))
                .isInstanceOf(BusinessException.class);
        assertThat(first.getAtrzOpnnCn()).isEqualTo("첫 의견");
        assertThat(peer.status()).isEqualTo(ApprovalStatus.ACTIVE);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("단계 이동 알림 의도는 같은 트랜잭션에서 활성 결재자에게 한 번 발행한다")
    void stageNotificationJoinsBusinessTransaction() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, 1, "first", true), line(1, 2, "next", false)));
        actor("first");
        TransactionSynchronizationManager.initSynchronization();

        service.confirmInformalSanction(7L, "C", null, 0);

        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("next");
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("next");
    }

    @Test
    @DisplayName("알림 의도 저장 실패는 결재 단계 처리에 전파되어 업무 롤백을 요구한다")
    void intentFailurePropagatesThroughStageTransition() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, 1, "first", true), line(1, 2, "next", false)));
        actor("first");
        TransactionSynchronizationManager.initSynchronization();

        org.mockito.Mockito.doThrow(new IllegalStateException("intent unavailable"))
                .when(eventPublisher).publishEvent(any(NotificationRequestedEvent.class));
        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0))
                .isInstanceOf(IllegalStateException.class);
        assertThat(TransactionSynchronizationManager.getSynchronizations()).isEmpty();
    }

    @Test
    @DisplayName("11단계 상신은 저장·알림 없이 거절한다")
    void rejectsMoreThanTenStages() {
        knownTask();
        List<ApprovalStageRequest> stages = IntStream.range(0, 11)
                .mapToObj(index -> stage(ApprovalStageKind.APPROVAL, "approver" + index)).toList();

        assertThatThrownBy(() -> service.registerInformalSanction(draft(), stages))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(informalSanctionRepository, detailRepository, historyRepository, eventPublisher);
    }

    @Test
    @DisplayName("서로 다른 단계에도 같은 결재자를 중복 지정할 수 없다")
    void rejectsDuplicateApproverAcrossStages() {
        knownTask();

        assertThatThrownBy(() -> service.registerInformalSanction(draft(), List.of(
                stage(ApprovalStageKind.APPROVAL, "first"), stage(ApprovalStageKind.AGREEMENT, "first"))))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(informalSanctionRepository, detailRepository, historyRepository, eventPublisher);
    }

    @Test
    @DisplayName("10단계 상신은 첫 단계만 활성화하고 전체 결재자를 한 번에 검증한다")
    void acceptsTenStagesAndActivatesOnlyFirst() {
        knownTask();
        String[] users = IntStream.range(0, 10).mapToObj(index -> "approver" + index).toArray(String[]::new);
        activeUsers(users);
        given(informalSanctionRepository.save(any(InformalSanction.class))).willAnswer(invocation -> {
            InformalSanction saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzSn", 7L);
            return saved;
        });
        List<ApprovalStageRequest> stages = java.util.Arrays.stream(users)
                .map(user -> stage(ApprovalStageKind.APPROVAL, user)).toList();

        assertThat(service.registerInformalSanction(draft(), stages)).isEqualTo(7L);

        ArgumentCaptor<Iterable<InformalSanctionDetail>> captor = ArgumentCaptor.captor();
        verify(detailRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(10);
        assertThat(captor.getValue()).filteredOn(detail -> detail.status() == ApprovalStatus.ACTIVE)
                .extracting(detail -> detail.getId().getUserId()).containsExactly("approver0");
        assertThat(captor.getValue()).filteredOn(detail -> detail.status() == ApprovalStatus.WAITING).hasSize(9);
        verify(userRepository).findAllById(new java.util.LinkedHashSet<>(List.of(users)));
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("approver0");
    }

    @Test
    @DisplayName("총 50명 상신은 50개 라인을 저장하고 첫 단계의 10명만 활성화·통지한다")
    void acceptsFiftyApproversAndNotifiesOnlyFirstStage() {
        knownTask();
        String[] users = IntStream.range(0, 50)
                .mapToObj(index -> "approver%02d".formatted(index)).toArray(String[]::new);
        activeUsers(users);
        given(informalSanctionRepository.save(any(InformalSanction.class))).willAnswer(invocation -> {
            InformalSanction saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzSn", 7L);
            return saved;
        });
        List<ApprovalStageRequest> stages = IntStream.range(0, 5)
                .mapToObj(index -> stage(ApprovalStageKind.APPROVAL,
                        java.util.Arrays.copyOfRange(users, index * 10, (index + 1) * 10))).toList();

        assertThat(service.registerInformalSanction(draft(), stages)).isEqualTo(7L);

        ArgumentCaptor<Iterable<InformalSanctionDetail>> captor = ArgumentCaptor.captor();
        verify(detailRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(50);
        assertThat(captor.getValue()).filteredOn(detail -> detail.status() == ApprovalStatus.ACTIVE)
                .extracting(detail -> detail.getId().getUserId())
                .containsExactly(java.util.Arrays.copyOf(users, 10));
        assertThat(captor.getValue()).filteredOn(detail -> detail.status() == ApprovalStatus.WAITING).hasSize(40);
        verify(userRepository).findAllById(new java.util.LinkedHashSet<>(List.of(users)));
        assertThat(events(NotificationRequestedEvent.class)).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly(java.util.Arrays.copyOf(users, 10));
        assertThat(events(SanctionStatusChangedEvent.class)).isEmpty();
    }

    @Test
    @DisplayName("단계 수와 단계별 인원이 유효해도 총 51명 상신은 저장·통지 없이 거절한다")
    void rejectsFiftyOneApproversAcrossValidStages() {
        knownTask();
        String[] users = IntStream.range(0, 51)
                .mapToObj(index -> "approver%02d".formatted(index)).toArray(String[]::new);
        List<ApprovalStageRequest> stages = IntStream.range(0, 6)
                .mapToObj(index -> stage(ApprovalStageKind.APPROVAL,
                        java.util.Arrays.copyOfRange(users, index * 10, Math.min((index + 1) * 10, users.length))))
                .toList();

        assertThatThrownBy(() -> service.registerInformalSanction(draft(), stages))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(informalSanctionRepository, detailRepository, historyRepository, userRepository, eventPublisher);
    }

    @Test
    @DisplayName("전체 인원이 50명 이하라도 한 단계에 11명은 저장·통지 없이 거절한다")
    void rejectsElevenApproversInSingleStage() {
        knownTask();
        String[] users = IntStream.range(0, 11)
                .mapToObj(index -> "approver%02d".formatted(index)).toArray(String[]::new);

        assertThatThrownBy(() -> service.registerInformalSanction(draft(),
                List.of(stage(ApprovalStageKind.APPROVAL, users))))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(informalSanctionRepository, detailRepository, historyRepository, userRepository, eventPublisher);
    }

    @Test
    @DisplayName("최종 승인 사건은 앱 알림 의도 저장을 위해 업무 트랜잭션 안에서 발행한다")
    void finalStatusEventJoinsBusinessTransaction() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, 1, "first", true)));
        actor("first");
        TransactionSynchronizationManager.initSynchronization();

        service.confirmInformalSanction(7L, "C", "완료", 0);

        assertThat(document.getAprvYn()).isEqualTo("C");
        assertThat(events(SanctionStatusChangedEvent.class)).hasSize(1);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        assertThat(events(SanctionStatusChangedEvent.class)).hasSize(1);
        assertThat(events(NotificationRequestedEvent.class)).isEmpty();
    }

    @Test
    @DisplayName("이전 차수에만 참여한 사용자는 새 본문·차수·행동 권한을 얻지 않는다")
    void historicalParticipantSeesOnlyParticipatedRevision() {
        InformalSanction document = header("R");
        InformalSanctionHistory previous = InformalSanctionHistory.create(document);
        document.resubmit("TASK", "20260917", "새 제목", "새 본문", "second");
        InformalSanctionHistory current = InformalSanctionHistory.create(document);
        InformalSanctionDetail previousLine = line(1, 1, "first", true);
        previousLine.decide(false, "이전 사유", LocalDateTime.of(2026, 9, 16, 10, 0));
        given(informalSanctionRepository.findByIdAndParticipant(7L, "first")).willReturn(Optional.of(document));
        given(detailRepository.findForDocuments(List.of(7L)))
                .willReturn(List.of(previousLine, line(2, 1, "second", true)));
        given(historyRepository.findForDocuments(List.of(7L))).willReturn(List.of(current, previous));
        knownTask();
        activeUsers("owner", "first", "second");
        actor("first");

        InformalSanctionDto result = service.getInformalSanction(7L, "first");

        assertThat(result.getDocTtl()).isEqualTo("원래 제목");
        assertThat(result.getDocCn()).isEqualTo("원래 본문");
        assertThat(result.getAtrzCycl()).isEqualTo(1);
        assertThat(result.getAprvYn()).isEqualTo("R");
        assertThat(result.getVersion()).isNull();
        assertThat(result.isCanApprove()).isFalse();
        assertThat(result.isCanWithdraw()).isFalse();
        assertThat(result.isCanResubmit()).isFalse();
        assertThat(result.getHistory()).extracting(revision -> revision.atrzCycl()).containsExactly(1);
        assertThat(result.getStages().get(0).approvers()).extracting(approver -> approver.userId())
                .containsExactly("first");
    }

    @Test
    @DisplayName("현재 차수의 미래 단계 참여자는 문서를 읽되 승인 버튼 권한은 받지 않는다")
    void currentWaitingParticipantCanReadWithoutActionPermission() {
        InformalSanction document = header("A");
        given(informalSanctionRepository.findByIdAndParticipant(7L, "next")).willReturn(Optional.of(document));
        given(detailRepository.findForDocuments(List.of(7L)))
                .willReturn(List.of(line(1, 1, "first", true), line(1, 2, "next", false)));
        given(historyRepository.findForDocuments(List.of(7L)))
                .willReturn(List.of(InformalSanctionHistory.create(document)));
        knownTask();
        activeUsers("owner", "first", "next");
        actor("next");

        InformalSanctionDto result = service.getInformalSanction(7L, "next");

        assertThat(result.getDocCn()).isEqualTo("원래 본문");
        assertThat(result.getVersion()).isEqualTo(0);
        assertThat(result.getStages()).extracting(stage -> stage.status())
                .containsExactly(ApprovalStatus.ACTIVE, ApprovalStatus.WAITING);
        assertThat(result.isCanApprove()).isFalse();
        assertThat(result.isCanWithdraw()).isFalse();
        assertThat(result.isCanResubmit()).isFalse();
    }

    @Test
    @DisplayName("대기 건수는 본인의 활성 라인을 직접 세며 문서·차수·사용자명 전체를 읽지 않는다")
    void pendingCountUsesScopedCountWithoutDtoLookups() {
        actor("first");
        given(informalSanctionRepository.countPending("first")).willReturn(3L);

        assertThat(service.getPendingApprovalCount("first")).isEqualTo(3L);

        verify(informalSanctionRepository).countPending("first");
        verifyNoInteractions(detailRepository, historyRepository, userRepository, commonCodeService);
    }

    @Test
    @DisplayName("호출자가 다른 사용자의 esntlId를 넘겨도 그 사람의 대기 건수를 조회할 수 없다")
    void cannotReadAnotherParticipantsPendingCount() {
        actor("owner");

        assertThatThrownBy(() -> service.getPendingApprovalCount("first"))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(informalSanctionRepository, detailRepository, historyRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"withdraw", "resubmit"})
    @DisplayName("회수·재상신도 오래된 version이면 차수·내용·라인을 변경하지 않는다")
    void staleVersionCannotWithdrawOrResubmit(String action) {
        InformalSanction document = header("resubmit".equals(action) ? "R" : "A");
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));

        assertThatThrownBy(() -> {
            if ("withdraw".equals(action)) service.deleteInformalSanction(7L, 1);
            else service.resubmitInformalSanction(7L, draft(), 1,
                    List.of(stage(ApprovalStageKind.APPROVAL, "second")));
        }).isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(document.getDocCn()).isEqualTo("원래 본문");
        verifyNoInteractions(detailRepository, historyRepository, commonCodeService, userRepository, eventPublisher);
    }

    @ParameterizedTest
    @ValueSource(strings = {"withdraw", "resubmit"})
    @DisplayName("참여 결재자도 신청자를 대신해 회수·재상신할 수 없다")
    void approverCannotWithdrawOrResubmitForApplicant(String action) {
        InformalSanction document = header("resubmit".equals(action) ? "R" : "A");
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        actor("first");

        assertThatThrownBy(() -> {
            if ("withdraw".equals(action)) service.deleteInformalSanction(7L, 0);
            else service.resubmitInformalSanction(7L, draft(), 0,
                    List.of(stage(ApprovalStageKind.APPROVAL, "second")));
        }).isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(document.getDocCn()).isEqualTo("원래 본문");
        verifyNoInteractions(detailRepository, historyRepository, commonCodeService, userRepository, eventPublisher);
    }

    @Test
    @DisplayName("수신 목록은 페이지 문서들의 최근 열람 가능 차수만 배치 조회한다")
    void receivedPageBatchesOnlyVisibleRevisionsAndUserNames() {
        InformalSanction current = header("A");
        InformalSanction other = InformalSanction.builder().ifmlAtrzSn(9L).aplcntId("owner")
                .aprvrId("first").taskSeCd("TASK").reqYmd("20260916")
                .docTtl("이전 제목").docCn("이전 본문").aprvYn("R").build();
        InformalSanctionHistory previous = InformalSanctionHistory.create(other);
        other.resubmit("TASK", "20260917", "새 비공개 제목", "새 비공개 본문", "second");
        InformalSanctionDetail previousLine = InformalSanctionDetail.create(new InformalSanctionDetailId(
                9L, BigDecimal.ONE, BigDecimal.ONE, "first"), ApprovalStageKind.APPROVAL, true);
        previousLine.decide(false, "이전 사유", LocalDateTime.of(2026, 9, 16, 10, 0));
        var pageable = PageRequest.of(0, 10);
        given(informalSanctionRepository.findByAprvrId("first", pageable))
                .willReturn(new PageImpl<>(List.of(current, other), pageable, 2));
        given(detailRepository.findVisibleForDocuments(List.of(7L, 9L), "first"))
                .willReturn(List.of(line(1, 1, "first", true), previousLine));
        given(historyRepository.findVisibleForDocuments(List.of(7L, 9L), "first"))
                .willReturn(List.of(InformalSanctionHistory.create(current), previous));
        knownTask();
        activeUsers("owner", "first");
        actor("first");

        var result = service.getReceivedInformalSanctionList("first", pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).isCanApprove()).isTrue();
        assertThat(result.getContent().get(1).getDocCn()).isEqualTo("이전 본문");
        assertThat(result.getContent().get(1).getVersion()).isNull();
        assertThat(result.getContent()).allSatisfy(dto -> assertThat(dto.getHistory()).isEmpty());
        verify(detailRepository).findVisibleForDocuments(List.of(7L, 9L), "first");
        verify(historyRepository).findVisibleForDocuments(List.of(7L, 9L), "first");
        verify(detailRepository, never()).findForDocuments(any());
        verify(historyRepository, never()).findForDocuments(any());
        verify(userRepository).findAllById(java.util.Set.of("owner", "first"));
        verify(commonCodeService).getCodesByGroup("COM075");
    }
}
