package nuri.business.service.informalsanction;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import nuri.business.domain.informalsanction.ApprovalProcessType;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailId;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.InformalSanctionProcess;
import nuri.business.domain.informalsanction.InformalSanctionProcessRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 결재 동선 개선(2026-10-03)의 서버 계약 — 재알림·처리 전 결재자 바꾸기(D6)·보완 요청과 답변(D7)·응답 힌트.
 *
 * <p>각 동작은 누가 할 수 있는지(기안자·차례인 결재자), 어떤 상태에서만 되는지, 무엇을 남기고 누구에게 알리는지를 고정한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("결재 재알림·결재자 바꾸기·보완 요청 계약")
class ApprovalCollaborationServiceTest {
    @Mock private InformalSanctionRepository informalSanctionRepository;
    @Mock private InformalSanctionDetailRepository detailRepository;
    @Mock private InformalSanctionHistoryRepository historyRepository;
    @Mock private InformalSanctionProcessRepository processRepository;
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
        java.util.Set<String> granted = java.util.Set.of("APPROVAL_APPROVE", "APPROVAL_CANCEL", "APPROVAL_CREATE");
        security.when(() -> SecurityUtil.hasPermission(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(invocation -> granted.contains(invocation.<String>getArgument(0)));
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private void actor(String userId) {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));
    }

    private InformalSanction header(String status) {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L)
                .aplcntId("owner").aprvrId("first").taskSeCd("TASK").reqYmd("20260916")
                .docTtl("원래 제목").docCn("원래 본문").aprvYn(status).build();
        ReflectionTestUtils.setField(document, "version", 3);
        return document;
    }

    private InformalSanctionDetail line(int order, String userId, ApprovalStatus status) {
        InformalSanctionDetail detail = InformalSanctionDetail.create(new InformalSanctionDetailId(
                7L, BigDecimal.ONE, BigDecimal.valueOf(order), userId), ApprovalStageKind.APPROVAL, false);
        ReflectionTestUtils.setField(detail, "aprvYn", status.getCode());
        if (status == ApprovalStatus.APPROVED) ReflectionTestUtils.setField(detail, "atrzDt", LocalDateTime.of(2026, 9, 30, 10, 0));
        return detail;
    }

    private InformalSanctionHistory writable(InformalSanction document, List<InformalSanctionDetail> lines) {
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        lenient().when(detailRepository.findRevision(7L, document.getAtrzCycl())).thenReturn(lines);
        InformalSanctionHistory history = InformalSanctionHistory.create(document);
        lenient().when(historyRepository.findById(new InformalSanctionHistoryId(7L, document.getAtrzCycl())))
                .thenReturn(Optional.of(history));
        return history;
    }

    private void processes(InformalSanctionProcess... rows) {
        given(processRepository.findForDocuments(List.of(7L))).willReturn(List.of(rows));
    }

    private InformalSanctionProcess process(InformalSanction document, ApprovalProcessType type, String actorId,
                                            String content, LocalDateTime at) {
        InformalSanctionProcess row = InformalSanctionProcess.record(document, type, actorId, null, null, content, at);
        ReflectionTestUtils.setField(row, "ifmlAtrzPrcsHstrySn", (long) at.getSecond() + at.getMinute() * 60L);
        return row;
    }

    private void eligible(String... userIds) {
        given(userRepository.findAllById(any())).willReturn(java.util.Arrays.stream(userIds)
                .map(userId -> User.builder().esntlId(userId).userId(userId).userNm(userId)
                        .pswd("{bcrypt}x").userSttsCd("P").build()).toList());
        lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(userIds));
    }

    private List<NotificationRequestedEvent> notifications() {
        ArgumentCaptor<Object> events = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeast(0)).publishEvent(events.capture());
        return events.getAllValues().stream().filter(NotificationRequestedEvent.class::isInstance)
                .map(NotificationRequestedEvent.class::cast).toList();
    }

    private InformalSanctionProcess savedProcess() {
        ArgumentCaptor<InformalSanctionProcess> saved = ArgumentCaptor.forClass(InformalSanctionProcess.class);
        verify(processRepository, org.mockito.Mockito.atLeastOnce()).save(saved.capture());
        return saved.getAllValues().getFirst();
    }

    @Test
    @DisplayName("재알림은 지금 차례인 결재자에게만 문서 링크로 가고 처리 이력에 남는다")
    void remindNotifiesActiveApproversWithDocumentLink() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.APPROVED), line(2, "second", ApprovalStatus.ACTIVE),
                line(3, "third", ApprovalStatus.WAITING)));
        processes();

        assertThat(service.remindApprovers(7L)).isEqualTo(1);

        assertThat(savedProcess().getPrcsTypeCd()).isEqualTo(ApprovalProcessType.REMIND);
        assertThat(notifications()).singleElement().satisfies(event -> {
            assertThat(event.receiverEsntlId()).isEqualTo("second");
            assertThat(event.linkUrl()).isEqualTo("/approvals?tab=PENDING&doc=7");
        });
    }

    @Test
    @DisplayName("재알림은 같은 차수에서 하루 한 번이다 — 오늘 이미 보냈으면 409")
    void remindIsOncePerDay() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.REMIND, "owner", null, LocalDateTime.now()));

        assertThatThrownBy(() -> service.remindApprovers(7L)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE));
        verify(processRepository, never()).save(any());
    }

    @Test
    @DisplayName("재알림은 기안자만, 진행 중인 문서에만 보낼 수 있다")
    void remindRequiresOwnerAndProgress() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        actor("first");
        assertThatThrownBy(() -> service.remindApprovers(7L)).isInstanceOf(BusinessException.class);

        actor("owner");
        InformalSanction finished = header("C");
        writable(finished, List.of(line(1, "first", ApprovalStatus.APPROVED)));
        assertThatThrownBy(() -> service.remindApprovers(7L)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
    }

    @Test
    @DisplayName("차례인 결재자를 바꾸면 같은 자리를 새 사람이 이어받고, 빠진 사람과 새 사람에게 알린다")
    void replaceActiveApproverKeepsSeatAndNotifiesBoth() {
        InformalSanction document = header("A");
        InformalSanctionDetail approved = line(1, "first", ApprovalStatus.APPROVED);
        InformalSanctionDetail absent = line(2, "second", ApprovalStatus.ACTIVE);
        writable(document, List.of(approved, absent));
        eligible("fourth");

        service.replaceApprover(7L, "second", "fourth", 3);

        ArgumentCaptor<InformalSanctionDetail> saved = ArgumentCaptor.forClass(InformalSanctionDetail.class);
        verify(detailRepository).delete(absent);
        verify(detailRepository).save(saved.capture());
        assertThat(saved.getValue().getId().getUserId()).isEqualTo("fourth");
        assertThat(saved.getValue().getId().getAtrzSeq()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(saved.getValue().status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(approved.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(document.getAprvrId()).isEqualTo("fourth");
        InformalSanctionProcess recorded = savedProcess();
        assertThat(recorded.getPrcsTypeCd()).isEqualTo(ApprovalProcessType.REPLACE);
        assertThat(recorded.getBfrUserId()).isEqualTo("second");
        assertThat(recorded.getTrgtUserId()).isEqualTo("fourth");
        assertThat(notifications()).extracting(NotificationRequestedEvent::receiverEsntlId, NotificationRequestedEvent::linkUrl)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("second", "/approvals"),
                        org.assertj.core.groups.Tuple.tuple("fourth", "/approvals?tab=PENDING&doc=7"));
    }

    @Test
    @DisplayName("아직 차례가 오지 않은 결재자를 바꾸면 새 사람에게 차례 알림을 보내지 않는다")
    void replaceWaitingApproverDoesNotNotifyNewApproverYet() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE), line(2, "second", ApprovalStatus.WAITING)));
        eligible("fourth");

        service.replaceApprover(7L, "second", "fourth", 3);

        assertThat(notifications()).extracting(NotificationRequestedEvent::receiverEsntlId).containsExactly("second");
        verify(entityManager).lock(document, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }

    @Test
    @DisplayName("이미 처리한 결재자·결재선의 사람·결재 권한 없는 사람으로는 바꿀 수 없다")
    void replaceRejectsDecidedDuplicateAndIneligible() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.APPROVED), line(2, "second", ApprovalStatus.ACTIVE)));

        assertThatThrownBy(() -> service.replaceApprover(7L, "first", "fourth", 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
        assertThatThrownBy(() -> service.replaceApprover(7L, "second", "first", 3)).isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미 결재선에 있는 사람");
        given(userRepository.findAllById(any())).willReturn(List.of(User.builder().esntlId("fourth").userId("fourth")
                .userNm("네번째").pswd("{bcrypt}x").userSttsCd("P").build()));
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of());
        assertThatThrownBy(() -> service.replaceApprover(7L, "second", "fourth", 3)).isInstanceOf(BusinessException.class)
                .hasMessageContaining("결재 권한이 없는 사용자는 결재자로 지정할 수 없습니다: 네번째");
        verify(detailRepository, never()).delete(any());
    }

    @Test
    @DisplayName("결재자 바꾸기는 기안자만 할 수 있고 버전이 다르면 409 다")
    void replaceRequiresOwnerAndVersion() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        assertThatThrownBy(() -> service.replaceApprover(7L, "first", "fourth", 2)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
        actor("first");
        assertThatThrownBy(() -> service.replaceApprover(7L, "first", "fourth", 3)).isInstanceOf(BusinessException.class);
        verify(detailRepository, never()).delete(any());
    }

    @Test
    @DisplayName("보완 요청은 차례인 결재자가 보내며 문서는 진행 중으로 남고 기안자에게 내 문서 링크로 알린다")
    void requestSupplementKeepsTurnAndNotifiesDrafter() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        processes();
        actor("first");

        service.requestSupplement(7L, "  교육비 금액을 적어 주세요  ", 3);

        InformalSanctionProcess recorded = savedProcess();
        assertThat(recorded.getPrcsTypeCd()).isEqualTo(ApprovalProcessType.ASK);
        assertThat(recorded.getFrstRgtrId()).isEqualTo("first");
        assertThat(recorded.getPrcsCn()).isEqualTo("교육비 금액을 적어 주세요");
        assertThat(document.getAprvYn()).isEqualTo("A");
        verify(entityManager).lock(document, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        assertThat(notifications()).singleElement().satisfies(event -> {
            assertThat(event.receiverEsntlId()).isEqualTo("owner");
            assertThat(event.linkUrl()).isEqualTo("/approvals?tab=SUBMITTED&doc=7");
        });
    }

    @Test
    @DisplayName("보완 요청은 한 번에 하나다 — 열린 요청이 있으면 409, 차례가 아니면 403")
    void requestSupplementRejectsSecondAndWaiting() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE), line(1, "peer", ApprovalStatus.ACTIVE),
                line(2, "later", ApprovalStatus.WAITING)));
        processes(process(document, ApprovalProcessType.ASK, "first", "질문", LocalDateTime.now()));
        actor("peer");
        assertThatThrownBy(() -> service.requestSupplement(7L, "또 질문", 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
        actor("later");
        assertThatThrownBy(() -> service.requestSupplement(7L, "질문", 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        verify(processRepository, never()).save(any());
    }

    @Test
    @DisplayName("열린 보완 요청이 없으면 답할 수 없다 — 요청한 결재자가 이미 결정했으면 닫힌 것이다")
    void answerRequiresOpenSupplement() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.APPROVED), line(2, "second", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.ASK, "first", "질문", LocalDateTime.now()));

        assertThatThrownBy(() -> service.answerSupplement(7L, "답", null, null, 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
    }

    @Test
    @DisplayName("내용을 고쳐 답하면 고치기 전 본문을 남기고, 앞서 승인한 사람에게 알리며 승인은 유지한다")
    void answerWithRevisionRecordsPreviousBodyAndKeepsApprovals() {
        InformalSanction document = header("A");
        InformalSanctionDetail approved = line(1, "first", ApprovalStatus.APPROVED);
        InformalSanctionHistory history = writable(document, List.of(approved, line(2, "second", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.ASK, "second", "금액을 적어 주세요", LocalDateTime.now()));

        service.answerSupplement(7L, "45만 원, 부서 부담입니다", null, "원래 본문\n교육비: 45만 원", 3);

        ArgumentCaptor<InformalSanctionProcess> saved = ArgumentCaptor.forClass(InformalSanctionProcess.class);
        verify(processRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(InformalSanctionProcess::getPrcsTypeCd, InformalSanctionProcess::getPrcsCn)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(ApprovalProcessType.ANSWER, "45만 원, 부서 부담입니다"),
                        org.assertj.core.groups.Tuple.tuple(ApprovalProcessType.REVISE, "원래 본문"));
        assertThat(document.getDocCn()).isEqualTo("원래 본문\n교육비: 45만 원");
        assertThat(history.getDocCn()).isEqualTo("원래 본문\n교육비: 45만 원");
        assertThat(approved.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(notifications()).extracting(NotificationRequestedEvent::receiverEsntlId, NotificationRequestedEvent::linkUrl)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("second", "/approvals?tab=PENDING&doc=7"),
                        org.assertj.core.groups.Tuple.tuple("first", "/approvals?tab=PROCESSED&doc=7"));
    }

    @Test
    @DisplayName("상세는 열린 보완 요청·지금 단계 시작 시각·부재·기안자 힌트를 싣는다")
    void detailCarriesSupplementStageSinceAbsenceAndHints() {
        InformalSanction document = header("A");
        InformalSanctionDetail approved = line(1, "first", ApprovalStatus.APPROVED);
        InformalSanctionDetail current = line(2, "second", ApprovalStatus.ACTIVE);
        given(informalSanctionRepository.findByIdAndParticipant(7L, "owner")).willReturn(Optional.of(document));
        given(detailRepository.findForDocuments(List.of(7L))).willReturn(List.of(approved, current));
        given(historyRepository.findForDocuments(List.of(7L))).willReturn(List.of(InformalSanctionHistory.create(document)));
        InformalSanctionProcess ask = process(document, ApprovalProcessType.ASK, "second", "금액을 적어 주세요", LocalDateTime.now());
        given(processRepository.findForDocuments(List.of(7L))).willReturn(List.of(ask));
        given(userRepository.findProfilesByEsntlIds(any())).willReturn(List.of(new UserSearchDto("second", "둘째", "기획팀", true)));

        InformalSanctionDto dto = service.getInformalSanction(7L, "owner");

        assertThat(dto.getOpenSupplement()).isNotNull();
        assertThat(dto.getOpenSupplement().askedBy()).isEqualTo("second");
        assertThat(dto.getCurrentStageSince()).isEqualTo(LocalDateTime.of(2026, 9, 30, 10, 0));
        assertThat(dto.getStages().get(1).approvers().getFirst().absent()).isTrue();
        assertThat(dto.isCanAnswerSupplement()).isTrue();
        assertThat(dto.isCanRemind()).isTrue();
        assertThat(dto.isCanReplaceApprover()).isTrue();
        assertThat(dto.isCanRequestSupplement()).isFalse();
        assertThat(dto.getProcessHistory()).singleElement()
                .satisfies(row -> assertThat(row.type()).isEqualTo(ApprovalProcessType.ASK));
    }
}
