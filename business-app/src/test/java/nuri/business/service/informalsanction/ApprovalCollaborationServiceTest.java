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
import nuri.business.domain.informalsanction.InformalSanctionReferenceRepository;
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
    @Mock private InformalSanctionReferenceRepository referenceRepository;
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
        // 처리 이력의 감사 컬럼은 로그인 ID 다 — esntlId 와 다른 값을 둬야 두 축을 섞으면 드러난다.
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of(loginId(userId)));
    }

    private static String loginId(String userId) {
        return "login-" + userId;
    }

    private InformalSanction header(String status) {
        return header(status, "원래 제목");
    }

    private InformalSanction header(String status, String title) {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L)
                .aplcntId("owner").aprvrId("first").taskSeCd("TASK").reqYmd("20260916")
                .docTtl(title).docCn("원래 본문").aprvYn(status).build();
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
        InformalSanctionProcess row = InformalSanctionProcess.record(document, type, actorId, loginId(actorId), null, null,
                content, at);
        ReflectionTestUtils.setField(row, "ifmlAtrzPrcsHstrySn", (long) at.getSecond() + at.getMinute() * 60L);
        return row;
    }

    /** 기안자가 결재자 from 을 to 로 바꾼 기록. */
    private InformalSanctionProcess replaced(InformalSanction document, String from, String to, LocalDateTime at) {
        InformalSanctionProcess row = InformalSanctionProcess.record(document, ApprovalProcessType.REPLACE, "owner",
                loginId("owner"), to, from, null, at);
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
        // 행위자는 두 축이다 — 대조·이름 표시는 esntlId, 감사 컬럼은 공통 계약대로 로그인 ID(헌법 제8조 3항).
        assertThat(recorded.getChgUserIdntfr()).isEqualTo("first");
        assertThat(recorded.getFrstRgtrId()).isEqualTo(loginId("first"));
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

        assertThatThrownBy(() -> service.answerSupplement(7L, "답", null, 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
    }

    @Test
    @DisplayName("내용을 고쳐 답하면 고치기 전 본문을 남기고, 앞서 승인한 사람에게 알리며 승인은 유지한다")
    void answerWithRevisionRecordsPreviousBodyAndKeepsApprovals() {
        InformalSanction document = header("A");
        InformalSanctionDetail approved = line(1, "first", ApprovalStatus.APPROVED);
        InformalSanctionHistory history = writable(document, List.of(approved, line(2, "second", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.ASK, "second", "금액을 적어 주세요", LocalDateTime.now()));

        service.answerSupplement(7L, "45만 원, 부서 부담입니다", "원래 본문\n교육비: 45만 원", 3);

        ArgumentCaptor<InformalSanctionProcess> saved = ArgumentCaptor.forClass(InformalSanctionProcess.class);
        verify(processRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(InformalSanctionProcess::getPrcsTypeCd, InformalSanctionProcess::getPrcsCn)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(ApprovalProcessType.ANSWER, "45만 원, 부서 부담입니다"),
                        org.assertj.core.groups.Tuple.tuple(ApprovalProcessType.REVISE, "원래 본문"));
        // 답변은 요청한 결재자(esntlId)에게 가고, 감사 컬럼에는 답한 기안자의 로그인 ID 가 남는다.
        assertThat(saved.getAllValues().getFirst()).satisfies(answer -> {
            assertThat(answer.getTrgtUserId()).isEqualTo("second");
            assertThat(answer.getChgUserIdntfr()).isEqualTo("owner");
            assertThat(answer.getFrstRgtrId()).isEqualTo(loginId("owner"));
        });
        assertThat(document.getDocCn()).isEqualTo("원래 본문\n교육비: 45만 원");
        assertThat(history.getDocCn()).isEqualTo("원래 본문\n교육비: 45만 원");
        // 제목은 고치지 않는다 — 앞서 승인한 사람이 본 제목을 남길 자리가 처리 이력에 없다(D7).
        assertThat(document.getDocTtl()).isEqualTo("원래 제목");
        assertThat(history.getDocTtl()).isEqualTo("원래 제목");
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
        given(userRepository.findAllById(any())).willReturn(List.of(User.builder().esntlId("second")
                .userId(loginId("second")).userNm("둘째").pswd("{bcrypt}x").userSttsCd("P").build()));

        InformalSanctionDto dto = service.getInformalSanction(7L, "owner");

        assertThat(dto.getOpenSupplement()).isNotNull();
        // 요청자 대조·이름은 esntlId 축이다 — 감사 컬럼(로그인 ID)으로 찾으면 요청이 닫힌 것처럼 보이고 이름이 빈다.
        assertThat(dto.getOpenSupplement().askedBy()).isEqualTo("second");
        assertThat(dto.getOpenSupplement().askedByNm()).isEqualTo("둘째");
        assertThat(dto.getCurrentStageSince()).isEqualTo(LocalDateTime.of(2026, 9, 30, 10, 0));
        assertThat(dto.getStages().get(1).approvers().getFirst().absent()).isTrue();
        assertThat(dto.isCanAnswerSupplement()).isTrue();
        assertThat(dto.isCanRemind()).isTrue();
        assertThat(dto.isCanReplaceApprover()).isTrue();
        assertThat(dto.isCanRequestSupplement()).isFalse();
        assertThat(dto.getProcessHistory()).singleElement().satisfies(row -> {
            assertThat(row.type()).isEqualTo(ApprovalProcessType.ASK);
            assertThat(row.actorNm()).isEqualTo("둘째");
        });
    }

    @Test
    @DisplayName("처리 이력의 감사 컬럼은 로그인 ID 다 — 로그인 ID 를 알 수 없으면 기록하지 않고 거부한다")
    void processHistoryRequiresLoginId() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        processes();
        actor("first");
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requestSupplement(7L, "질문", 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.UNAUTHORIZED));
        verify(processRepository, never()).save(any());
    }

    @Test
    @DisplayName("제목 없이 올라온 문서도 보완 답변을 할 수 있다 — 저장된 제목은 검사하지 않고 그대로 둔다")
    void answerWorksForDocumentWithoutTitle() {
        InformalSanction document = header("A", null);
        InformalSanctionHistory history = writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.ASK, "first", "금액을 적어 주세요", LocalDateTime.now()));

        service.answerSupplement(7L, "45만 원입니다", "원래 본문\n교육비: 45만 원", 3);

        assertThat(savedProcess().getPrcsTypeCd()).isEqualTo(ApprovalProcessType.ANSWER);
        assertThat(document.getDocTtl()).isNull();
        assertThat(history.getDocTtl()).isNull();
        assertThat(document.getDocCn()).isEqualTo("원래 본문\n교육비: 45만 원");
        assertThat(notifications()).singleElement().satisfies(event -> {
            assertThat(event.receiverEsntlId()).isEqualTo("first");
            assertThat(event.content()).startsWith("결재(번호 7)");
        });
    }

    @Test
    @DisplayName("보완 답변의 본문은 4000자까지다 — 넘으면 아무것도 남기지 않고 400")
    void answerRejectsTooLongBody() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        processes(process(document, ApprovalProcessType.ASK, "first", "금액을 적어 주세요", LocalDateTime.now()));

        assertThatThrownBy(() -> service.answerSupplement(7L, "답", "가".repeat(4001), 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE));
        verify(processRepository, never()).save(any());
        assertThat(document.getDocCn()).isEqualTo("원래 본문");
    }

    @Test
    @DisplayName("요청한 결재자를 바꿨다가 다시 넣어도 앞 자리의 보완 요청은 닫힌 채다")
    void replacedOutAskerReAddedDoesNotReviveSupplement() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "first", ApprovalStatus.ACTIVE)));
        LocalDateTime at = LocalDateTime.of(2026, 10, 3, 9, 0);
        processes(process(document, ApprovalProcessType.ASK, "first", "금액을 적어 주세요", at),
                replaced(document, "first", "fourth", at.plusSeconds(1)),
                replaced(document, "fourth", "first", at.plusSeconds(2)));

        // 기안자에게는 답할 요청이 없다 — 앞 자리의 질문에 답하게 하지 않는다.
        assertThatThrownBy(() -> service.answerSupplement(7L, "답", null, 3)).isInstanceOf(BusinessException.class)
                .hasMessageContaining("답할 보완 요청이 없습니다")
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
        // 다시 들어온 결재자는 새로 보완을 요청할 수 있다.
        actor("first");
        service.requestSupplement(7L, "새 질문", 3);
        assertThat(savedProcess()).satisfies(row -> {
            assertThat(row.getPrcsTypeCd()).isEqualTo(ApprovalProcessType.ASK);
            assertThat(row.getPrcsCn()).isEqualTo("새 질문");
        });
    }

    @Test
    @DisplayName("결재선에서 빠진 결재자가 늦게 처리하면 403 이 아니라 사유를 밝힌 409 다 — 결재선에 없던 사람은 그대로 403")
    void replacedOutApproverGetsConflictWithReason() {
        InformalSanction document = header("A");
        writable(document, List.of(line(1, "fourth", ApprovalStatus.ACTIVE)));
        processes(replaced(document, "first", "fourth", LocalDateTime.of(2026, 10, 3, 9, 0)));
        String reason = "기안자가 결재자를 바꿔 이 결재선에서 빠졌습니다. 최신 상태를 확인해 주세요.";

        actor("first");
        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 3)).isInstanceOf(BusinessException.class)
                .hasMessage(reason)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
        assertThatThrownBy(() -> service.requestSupplement(7L, "질문", 3)).isInstanceOf(BusinessException.class)
                .hasMessage(reason)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));

        // 결재선에 있던 적이 없는 사람에게는 문서가 어떻게 됐는지 알리지 않는다(H3).
        actor("stranger");
        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        assertThatThrownBy(() -> service.requestSupplement(7L, "질문", 3)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        verify(processRepository, never()).save(any());
        assertThat(document.getAprvYn()).isEqualTo("A");
    }
}
