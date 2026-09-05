package nuri.business.service.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import org.mockito.MockedStatic;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.security.util.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

@ExtendWith(MockitoExtension.class)
@DisplayName("InformalSanctionService 테스트")
class InformalSanctionServiceTest {

    @Mock
    private InformalSanctionRepository informalSanctionRepository;

    @Mock
    private CommonCodeService commonCodeService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @org.mockito.Spy
    nuri.business.service.informalsanction.dto.InformalSanctionMapper informalSanctionMapper = new nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl();

    @InjectMocks
    private InformalSanctionService informalSanctionService;

    private MockedStatic<SecurityUtil> securityUtilMock;

    @BeforeEach
    void setUp() {
        securityUtilMock = mockStatic(SecurityUtil.class);
    }

    @AfterEach
    void tearDown() {
        securityUtilMock.close();
    }

    @Test
    @DisplayName("신청 목록 조회 테스트")
    void getInformalSanctionListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        InformalSanction sanction = InformalSanction.builder().ifmlAtrzSn(1L).build();
        given(informalSanctionRepository.findByAplcntId("user1", pageable)).willReturn(new PageImpl<>(List.of(sanction)));

        // When
        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList("user1", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("상세 조회 테스트 - 성공")
    void getInformalSanction_Success() {
        // Given
        InformalSanction sanction = InformalSanction.builder()
                .ifmlAtrzSn(1L).taskSeCd("C1").aplcntId("user1").aprvrId("boss1").build();
        given(informalSanctionRepository.findByIdAndParticipant(1L, "user1"))
                .willReturn(Optional.of(sanction));
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of());

        // When
        InformalSanctionDto result = informalSanctionService.getInformalSanction(1L, "user1");

        // Then
        assertThat(result.getIfmlAtrzSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("상세 조회 테스트 - 실패")
    void getInformalSanction_NotFound_ThrowsException() {
        // Given
        given(informalSanctionRepository.findByIdAndParticipant(1L, "user1"))
                .willReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> informalSanctionService.getInformalSanction(1L, "user1"))
                .isInstanceOf(BusinessException.class);

        verify(informalSanctionRepository, never()).findById(1L);
    }

    @Test
    @DisplayName("결재 등록 테스트")
    void registerInformalSanctionTest() {
        // Given
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .taskSeCd("C1")
                .build();
        given(commonCodeService.getCodesByGroup("COM075"))
                .willReturn(List.of(new nuri.business.service.code.dto.CommonCodeDto("COM075", "C1", "일반", null, "Y")));
        given(informalSanctionRepository.save(any(InformalSanction.class)))
                .willReturn(InformalSanction.builder().ifmlAtrzSn(1L).build());

        // When
        informalSanctionService.registerInformalSanction(dto);

        // Then
        verify(informalSanctionRepository).save(any(InformalSanction.class));
    }

    /**
     * [2026-09-05] 업무 구분은 COM075 에 등록된 코드여야 한다. 등록되지 않은 코드로 저장되면 목록·상세·
     * 알림이 원시 코드를 노출하고, 그룹이 비어 있을 때 임의 값이 들어가면 PD-DB-003 을 우회한다.
     */
    @Test
    @DisplayName("등록되지 않은 업무 구분 코드로는 결재를 만들 수 없다")
    void registerRejectsUnknownTaskType() {
        InformalSanctionDto dto = InformalSanctionDto.builder().taskSeCd("ZZ").aprvrId("boss").build();
        given(commonCodeService.getCodesByGroup("COM075"))
                .willReturn(List.of(new nuri.business.service.code.dto.CommonCodeDto("COM075", "C1", "일반", null, "Y")));

        assertThatThrownBy(() -> informalSanctionService.registerInformalSanction(dto))
                .isInstanceOf(BusinessException.class);

        verify(informalSanctionRepository, never()).save(any(InformalSanction.class));
    }

    @Test
    @DisplayName("결재 승인 처리 테스트")
    void confirmInformalSanctionTest() {
        // Given
        String sanctionerId = "admin";
        InformalSanction sanction = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("user1")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(sanction));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(sanctionerId));

        // When
        informalSanctionService.confirmInformalSanction(1L, SanctionStatus.APPROVED.getCode(), "Reason");

        // Then
        assertThat(sanction.getAprvYn()).isEqualTo(SanctionStatus.APPROVED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    /**
     * [2026-09-05] 결재함의 '처리 이력' 탭이 신청자 기준 목록을 부르고 있었다. 결재자가
     * 처리한 건은 결재자 축 + 승인·반려 상태로만 좁혀야 한다 — 대기(A)가 섞이면 '처리한 것'
     * 이라는 화면의 약속이 깨진다.
     */
    @Test
    @DisplayName("처리한 결재 목록은 결재자 기준으로 승인·반려 상태만 조회한다")
    void getProcessedApprovalListQueriesApproverWithProcessedStatuses() {
        Pageable pageable = PageRequest.of(0, 10);
        InformalSanction approved = InformalSanction.builder()
                .ifmlAtrzSn(1L).aplcntId("user1").aprvrId("admin")
                .aprvYn(SanctionStatus.APPROVED.getCode()).build();
        given(informalSanctionRepository.findByAprvrIdAndAprvYnIn(
                eq("admin"), eq(List.of("C", "R")), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(approved)));

        Page<InformalSanctionDto> result = informalSanctionService.getProcessedApprovalList("admin", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAprvYn()).isEqualTo("C");
        verify(informalSanctionRepository).findByAprvrIdAndAprvYnIn(eq("admin"), eq(List.of("C", "R")), eq(pageable));
        verify(informalSanctionRepository, never()).findByAprvrId(any(), any());
        verify(informalSanctionRepository, never()).findByAplcntId(any(), any());
    }

    @Test
    @DisplayName("업무 구분 선택지는 COM075 사용 중 상세코드이며, 없으면 빈 목록을 그대로 돌려준다")
    void getTaskTypesReadsCom075WithoutInventing() {
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of());

        assertThat(informalSanctionService.getTaskTypes()).isEmpty();

        verify(commonCodeService).getCodesByGroup("COM075");
    }
}
