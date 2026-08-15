package nuri.business.service.informalsanction;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.security.util.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InformalSanctionService 단위 테스트")
class InformalSanctionServiceImplTest {

    @org.mockito.Spy
    nuri.business.service.informalsanction.dto.InformalSanctionMapper informalSanctionMapper = new nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl();

    @InjectMocks
    private InformalSanctionService informalSanctionService;

    @Mock
    private InformalSanctionRepository informalSanctionRepository;

    @Mock
    private CommonCodeService commonCodeService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private MockedStatic<SecurityUtil> securityUtilMock;

    @BeforeEach
    void setUp() {
        securityUtilMock = mockStatic(SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS);
    }

    @AfterEach
    void tearDown() {
        securityUtilMock.close();
    }

    @Test
    @DisplayName("getInformalSanctionList 테스트 - aplcntId 있음")
    void getInformalSanctionList_withAplcntId() {
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().ifmlAtrzSn(1L).build()));
        given(informalSanctionRepository.findByAplcntId(eq("user1"), any())).willReturn(page);

        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList("user1", PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getInformalSanctionList 테스트 - 신청자 ID 없이는 전체 조회하지 않고 거부")
    void getInformalSanctionList_withoutAplcntId() {
        assertThatThrownBy(() -> informalSanctionService.getInformalSanctionList(null, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);

        verify(informalSanctionRepository, never()).findAll(any(PageRequest.class));
    }

    @Test
    @DisplayName("getReceivedInformalSanctionList 테스트")
    void getReceivedInformalSanctionList() {
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().ifmlAtrzSn(1L).build()));
        given(informalSanctionRepository.findByAprvrId(eq("user1"), any())).willReturn(page);

        Page<InformalSanctionDto> result = informalSanctionService.getReceivedInformalSanctionList("user1", PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getInformalSanction 테스트")
    void getInformalSanction() {
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L).taskSeCd("CD1").aplcntId("APP1").aprvrId("APR1").build();
        given(informalSanctionRepository.findByIdAndParticipant(1L, "APP1"))
                .willReturn(Optional.of(entity));
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of(new CommonCodeDto("COM075", "CD1", "TaskName", "", "Y")));

        InformalSanctionDto result = informalSanctionService.getInformalSanction(1L, "APP1");

        assertThat(result.getIfmlAtrzSn()).isEqualTo(1L);
        assertThat(result.getTaskSeNm()).isEqualTo("TaskName");
    }

    @Test
    @DisplayName("상세 BOLA 방어 - 제3자는 PK를 알아도 결재 내용을 볼 수 없음")
    void getInformalSanction_foreignParticipantIsHidden() {
        InformalSanction foreign = InformalSanction.builder()
                .ifmlAtrzSn(2L).taskSeCd("CD1").aplcntId("OWNER").aprvrId("APPROVER").build();
        // 비스코프 findById로 회귀하면 이 sentinel이 노출되어 테스트가 red가 된다.
        lenient().when(informalSanctionRepository.findById(2L)).thenReturn(Optional.of(foreign));
        given(informalSanctionRepository.findByIdAndParticipant(2L, "ATTACKER"))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> informalSanctionService.getInformalSanction(2L, "ATTACKER"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        verify(informalSanctionRepository, never()).findById(2L);
        verifyNoInteractions(commonCodeService);
    }

    @Test
    @DisplayName("registerInformalSanction 테스트 (새로운 ID 생성)")
    void registerInformalSanction() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setTaskSeCd("CD1");
        dto.setAplcntId("APP1");
        given(informalSanctionRepository.save(any(InformalSanction.class)))
                .willReturn(InformalSanction.builder().ifmlAtrzSn(1L).build());
        
        informalSanctionService.registerInformalSanction(dto);

        verify(informalSanctionRepository, times(1)).save(any(InformalSanction.class));
    }

    @Test
    @DisplayName("updateInformalSanction 테스트 - 성공")
    void updateInformalSanction_Success() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setIfmlAtrzSn(1L);
        
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvYn("A") // 신청 상태
                .build();
                
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("APPLICANT_01"));

        informalSanctionService.updateInformalSanction(dto);

        verify(informalSanctionRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("updateInformalSanction 테스트 - 상태 에러")
    void updateInformalSanction_InvalidState() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setIfmlAtrzSn(1L);
        
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvYn("C") // 승인 상태
                .build();
                
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("APPLICANT_01"));

        assertThatThrownBy(() -> informalSanctionService.updateInformalSanction(dto))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_STATE);
    }

    @Test
    @DisplayName("deleteInformalSanction 테스트 - 성공")
    void deleteInformalSanction_Success() {
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvYn("A")
                .build();
                
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("APPLICANT_01"));

        informalSanctionService.deleteInformalSanction(1L);

        verify(informalSanctionRepository, times(1)).delete(entity);
    }

    @Test
    @DisplayName("deleteInformalSanction 테스트 - 권한 에러")
    void deleteInformalSanction_AccessDenied() {
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvYn("A")
                .build();
                
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("OTHER_USER"));

        assertThatThrownBy(() -> informalSanctionService.deleteInformalSanction(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("비정형 결재 승인 성공 (정상 권한 및 상태)")
    void confirmInformalSanction_Success() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(sanctionerId));

        informalSanctionService.confirmInformalSanction(1L, SanctionStatus.APPROVED.getCode(), null);

        assertThat(entity.getAprvYn()).isEqualTo(SanctionStatus.APPROVED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("비정형 결재 반려 성공")
    void confirmInformalSanction_Reject() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(sanctionerId));

        informalSanctionService.confirmInformalSanction(1L, SanctionStatus.REJECTED.getCode(), "Reject Reason");

        assertThat(entity.getAprvYn()).isEqualTo(SanctionStatus.REJECTED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("비정형 결재 승인 실패 - 잘못된 상태 코드")
    void confirmInformalSanction_InvalidStatusCode() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById(1L)).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(sanctionerId));

        assertThatThrownBy(() -> informalSanctionService.confirmInformalSanction(1L, "UNKNOWN", null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
    }
}
