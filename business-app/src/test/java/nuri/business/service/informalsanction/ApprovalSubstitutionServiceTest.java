package nuri.business.service.informalsanction;

import jakarta.persistence.EntityManager;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailId;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.InformalSanctionProcessRepository;
import nuri.business.domain.informalsanction.InformalSanctionReferenceRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * [V2_151] 부재 대리결재와 결재 첨부 할당(H3). 대리결재자는 오늘 부재 기간에 결재를 맡긴 원결재자의 <b>차례인</b> 줄만 대신 결정하고,
 * 결정한 줄에 원결재자와 따로 남으며 응답 전에 민감 작업 감사에 기록된다. 기간이 끝났거나 맡기지 않은 사람, 기안자 본인, 같은 차수
 * 결재선에 있는 사람은 대신 결정하지 못한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("약식결재 대리결재·첨부 할당 계약")
class ApprovalSubstitutionServiceTest {
    @Mock private InformalSanctionRepository informalSanctionRepository;
    @Mock private InformalSanctionDetailRepository detailRepository;
    @Mock private InformalSanctionHistoryRepository historyRepository;
    @Mock private InformalSanctionProcessRepository processRepository;
    @Mock private InformalSanctionReferenceRepository referenceRepository;
    @Mock private CommonCodeService commonCodeService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;
    @Mock private UserAbsenceRepository userAbsenceRepository;
    @Mock private AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    @Mock private SensitiveAuditPort sensitiveAudit;
    @Spy private InformalSanctionMapper informalSanctionMapper = new InformalSanctionMapperImpl();
    @InjectMocks private InformalSanctionService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(() -> SecurityUtil.hasPermission(anyString())).thenReturn(true);
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("login"));
        actor("sub");
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private void actor(String esntlId) {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(esntlId));
    }

    private void delegatorsOfActor(String... delegators) {
        given(userAbsenceRepository.findDelegatorsOn(anyString(), anyString())).willReturn(List.of(delegators));
    }

    private static InformalSanction document(String status) {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L).aplcntId("drafter").aprvrId("first")
                .taskSeCd("TASK").reqYmd("20261112").docTtl("제목").docCn("본문").aprvYn(status).build();
        ReflectionTestUtils.setField(document, "version", 0);
        return document;
    }

    private static InformalSanctionDetail line(int order, String userId, boolean active) {
        return InformalSanctionDetail.create(new InformalSanctionDetailId(7L, BigDecimal.ONE, BigDecimal.valueOf(order),
                userId), ApprovalStageKind.APPROVAL, active);
    }

    private void writable(InformalSanction document, List<InformalSanctionDetail> lines) {
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, BigDecimal.ONE)).willReturn(lines);
        org.mockito.Mockito.lenient().when(historyRepository.findById(new InformalSanctionHistoryId(7L, BigDecimal.ONE)))
                .thenReturn(Optional.of(InformalSanctionHistory.create(document)));
    }

    @Test
    @DisplayName("유효한 대리결재자는 맡긴 사람의 차례인 줄을 대신 승인하고, 원결재자·결정자를 따로 남기며 감사에 기록한다")
    void substituteApprovesOnBehalfOfAbsentApprover() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        InformalSanctionDetail second = line(2, "second", false);
        writable(document, List.of(first, second));
        delegatorsOfActor("first");

        service.confirmInformalSanction(7L, "C", "대신 승인", 0, "first");

        assertThat(first.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(first.getId().getUserId()).isEqualTo("first");
        assertThat(first.getSbtAprvrId()).isEqualTo("sub");
        assertThat(second.status()).isEqualTo(ApprovalStatus.ACTIVE);
        verify(sensitiveAudit).recordMutation(InformalSanctionService.SUBSTITUTE_AUDIT_OPERATION, "7/1/first");
        ArgumentCaptor<Object> events = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(events.capture());
        assertThat(events.getAllValues()).anySatisfy(event -> {
            assertThat(event).isInstanceOf(NotificationRequestedEvent.class);
            assertThat(((NotificationRequestedEvent) event).receiverEsntlId()).isEqualTo("first");
        });
    }

    @Test
    @DisplayName("맡긴 줄이 하나면 onBehalfOf 를 비워도 대신 반려한다")
    void substituteRejectsWithoutExplicitPrincipalWhenUnambiguous() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        writable(document, List.of(first));
        delegatorsOfActor("first");

        service.confirmInformalSanction(7L, "R", "자료 보완 필요", 0, null);

        assertThat(first.status()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(first.getSbtAprvrId()).isEqualTo("sub");
        assertThat(document.getAprvYn()).isEqualTo("R");
        verify(sensitiveAudit).recordMutation(InformalSanctionService.SUBSTITUTE_AUDIT_OPERATION, "7/1/first");
    }

    @Test
    @DisplayName("기간이 끝난 대리결재자·맡기지 않은 제3자는 결재선 밖 사람처럼 403 이다")
    void expiredOrUnrelatedSubstituteIsDenied() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        writable(document, List.of(first));
        delegatorsOfActor();

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0, "first"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("맡긴 사람이 아직 차례가 아니면 대신 결정하지 못한다")
    void substituteCannotDecideWaitingLine() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        InformalSanctionDetail second = line(2, "second", false);
        writable(document, List.of(first, second));
        delegatorsOfActor("second");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0, "second"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(second.status()).isEqualTo(ApprovalStatus.WAITING);
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("기안자 본인은 자기 문서를 대리결재로 결정하지 못한다")
    void drafterCannotSubstituteOnOwnDocument() {
        actor("drafter");
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        writable(document, List.of(first));
        delegatorsOfActor("first");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0, "first"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
    }

    @Test
    @DisplayName("같은 차수 결재선에 있는 사람은 다른 줄을 대신 결정하지 못한다(한 차수 두 줄 결정 금지)")
    void lineMemberCannotSubstituteAnotherLineInSameCycle() {
        actor("second");
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        InformalSanctionDetail second = line(2, "second", false);
        writable(document, List.of(first, second));
        delegatorsOfActor("first");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0, "first"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(first.status()).isEqualTo(ApprovalStatus.ACTIVE);
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("같은 단계에서 여러 사람이 맡겼는데 원결재자를 고르지 않으면 400 이다")
    void ambiguousSubstitutionNeedsPrincipal() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        InformalSanctionDetail other = InformalSanctionDetail.create(new InformalSanctionDetailId(7L, BigDecimal.ONE,
                BigDecimal.ONE, "other"), ApprovalStageKind.APPROVAL, true);
        writable(document, List.of(first, other));
        delegatorsOfActor("first", "other");

        assertThatThrownBy(() -> service.confirmInformalSanction(7L, "C", null, 0, null))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("지금 대신 결정할 차례가 있는 대리결재자만 상세를 열고, 힌트가 원결재자를 말한다 — 기간이 끝나면 404")
    void substituteSeesDetailOnlyWhileActionable() {
        InformalSanction document = document("A");
        InformalSanctionDetail first = line(1, "first", true);
        given(informalSanctionRepository.findByIdAndParticipant(7L, "sub")).willReturn(Optional.empty());
        given(informalSanctionRepository.findById(7L)).willReturn(Optional.of(document));
        given(detailRepository.findRevision(7L, BigDecimal.ONE)).willReturn(List.of(first));
        given(detailRepository.findForDocuments(List.of(7L))).willReturn(List.of(first));
        given(historyRepository.findForDocuments(List.of(7L))).willReturn(List.of(InformalSanctionHistory.create(document)));
        given(commonCodeService.getCodesByGroup(any())).willReturn(List.<CommonCodeDto>of());
        delegatorsOfActor("first");

        InformalSanctionDto dto = service.getInformalSanction(7L, "sub");

        assertThat(dto.isCanApprove()).isTrue();
        assertThat(dto.getOnBehalfOfId()).isEqualTo("first");
        assertThat(dto.isCanRequestSupplement()).isFalse();
        assertThat(dto.isCanAddReference()).isFalse();

        given(userAbsenceRepository.findDelegatorsOn(anyString(), anyString())).willReturn(List.of());
        assertThatThrownBy(() -> service.getInformalSanction(7L, "sub")).isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("오늘 맡긴 사람이 있으면 대기함이 대리결재 질의를 쓰고, 없으면 종전 질의를 쓴다")
    void pendingListUsesSubstitutionQueryOnlyWithDelegators() {
        var pageable = PageRequest.of(0, 10);
        delegatorsOfActor();
        given(informalSanctionRepository.findPending(eq("sub"), any(), any(), any(), any(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of()));
        service.getPendingApprovalList("sub", ApprovalListFilter.NONE, pageable);
        verify(informalSanctionRepository, never()).findPendingWithSubstitution(any(), any(), any(), any(), any(), any(), any());

        delegatorsOfActor("first");
        given(informalSanctionRepository.findPendingWithSubstitution(eq("sub"), eq(List.of("first")), any(), any(), any(),
                any(), eq(pageable))).willReturn(new PageImpl<>(List.of()));
        service.getPendingApprovalList("sub", ApprovalListFilter.NONE, pageable);
        verify(informalSanctionRepository).findPendingWithSubstitution(eq("sub"), eq(List.of("first")), any(), any(),
                any(), any(), eq(pageable));
    }

    @Test
    @DisplayName("새 문서의 첨부는 원 업로더 확인을 저장보다 먼저 지나야 붙는다")
    void attachmentIsCheckedBeforeTheDocumentIsSaved() {
        actor("drafter");
        given(commonCodeService.getCodesByGroup(any())).willReturn(List.of(new CommonCodeDto("COM075", "TASK", "업무", null, "Y")));
        given(userRepository.findAllById(any())).willReturn(List.of(nuri.business.domain.user.entity.User.builder()
                .esntlId("first").userId("first").userNm("결재자").pswd("{bcrypt}x").userSttsCd("P").build()));
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of("first"));
        given(informalSanctionRepository.save(any())).willAnswer(invocation -> {
            InformalSanction saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzSn", 7L);
            return saved;
        });
        InformalSanctionDto draft = InformalSanctionDto.builder().taskSeCd("TASK").aplcntId("drafter").reqYmd("20261112")
                .docTtl("제목").docCn("본문").atchFileSn(900L).build();

        service.registerInformalSanction(draft,
                List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of("first"))), null);

        InOrder order = inOrder(attachmentAssignmentPolicy, informalSanctionRepository);
        order.verify(attachmentAssignmentPolicy).assertAssignable(900L);
        order.verify(informalSanctionRepository).save(org.mockito.ArgumentMatchers.argThat(
                saved -> Long.valueOf(900L).equals(saved.getAtchFileSn())));
    }

    @Test
    @DisplayName("남이 올린 첨부는 붙일 수 없다 — 할당 거부면 문서를 저장하지 않는다")
    void foreignAttachmentRejectsTheWholeDraft() {
        actor("drafter");
        given(commonCodeService.getCodesByGroup(any())).willReturn(List.of(new CommonCodeDto("COM075", "TASK", "업무", null, "Y")));
        given(userRepository.findAllById(any())).willReturn(List.of(nuri.business.domain.user.entity.User.builder()
                .esntlId("first").userId("first").userNm("결재자").pswd("{bcrypt}x").userSttsCd("P").build()));
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of("first"));
        org.mockito.Mockito.doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(901L);
        InformalSanctionDto draft = InformalSanctionDto.builder().taskSeCd("TASK").aplcntId("drafter").reqYmd("20261112")
                .atchFileSn(901L).build();

        assertThatThrownBy(() -> service.registerInformalSanction(draft,
                List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of("first"))), null))
                .isInstanceOf(BusinessException.class);
        verify(informalSanctionRepository, never()).save(any());
    }

    @Test
    @DisplayName("진행 중이거나 끝난 문서의 첨부는 바꿀 수 없다 — 반려·회수된 문서만 재상신으로 바꾼다")
    void attachmentIsFrozenOutsideResubmittableStates() {
        for (String status : List.of("A", "C")) {
            InformalSanction document = document(status);
            assertThatThrownBy(() -> document.replaceAttachment(902L)).isInstanceOf(BusinessException.class);
            assertThat(document.getAtchFileSn()).isNull();
        }
        for (String status : List.of("R", "W")) {
            InformalSanction document = document(status);
            document.replaceAttachment(902L);
            assertThat(document.getAtchFileSn()).isEqualTo(902L);
            assertThat(InformalSanctionHistory.create(document).getAtchFileSn()).isEqualTo(902L);
        }
    }
}
