package nuri.business.service.informalsanction;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.code.EgovCommonCodeService;
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
@DisplayName("InformalSanctionServiceImpl 단위 테스트")
class InformalSanctionServiceImplTest {

    @InjectMocks
    private InformalSanctionServiceImpl informalSanctionService;

    @Mock
    private InformalSanctionRepository informalSanctionRepository;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

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
    @DisplayName("getInformalSanctionList 테스트 - aplcntId 있음")
    void getInformalSanctionList_withAplcntId() {
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().ifmlAtrzId("ID1").build()));
        given(informalSanctionRepository.findByAplcntId(eq("user1"), any())).willReturn(page);

        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList("user1", PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getInformalSanctionList 테스트 - aplcntId 없음")
    void getInformalSanctionList_withoutAplcntId() {
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().ifmlAtrzId("ID1").build()));
        given(informalSanctionRepository.findAll(any(PageRequest.class))).willReturn(page);

        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList(null, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getReceivedInformalSanctionList 테스트")
    void getReceivedInformalSanctionList() {
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().ifmlAtrzId("ID1").build()));
        given(informalSanctionRepository.findByAprvrId(eq("user1"), any())).willReturn(page);

        Page<InformalSanctionDto> result = informalSanctionService.getReceivedInformalSanctionList("user1", PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("getInformalSanction 테스트")
    void getInformalSanction() {
        InformalSanction entity = InformalSanction.builder().ifmlAtrzId("ID1").taskSeCd("CD1").build();
        given(informalSanctionRepository.findById("ID1")).willReturn(Optional.of(entity));
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of(new CommonCodeDto("COM075", "CD1", "TaskName", "", "Y")));

        InformalSanctionDto result = informalSanctionService.getInformalSanction("ID1");

        assertThat(result.getIfmlAtrzId()).isEqualTo("ID1");
        assertThat(result.getTaskSeNm()).isEqualTo("TaskName");
    }

    @Test
    @DisplayName("registerInformalSanction 테스트 (새로운 ID 생성)")
    void registerInformalSanction() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setTaskSeCd("CD1");
        dto.setAplcntId("APP1");
        
        informalSanctionService.registerInformalSanction(dto);

        verify(informalSanctionRepository, times(1)).save(any(InformalSanction.class));
    }

    @Test
    @DisplayName("updateInformalSanction 테스트 - 성공")
    void updateInformalSanction_Success() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setIfmlAtrzId("SANC_01");
        
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvYn("A") // 신청 상태
                .build();
                
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of("APPLICANT_01"));

        informalSanctionService.updateInformalSanction(dto);

        verify(informalSanctionRepository, times(1)).findById("SANC_01");
    }

    @Test
    @DisplayName("updateInformalSanction 테스트 - 상태 에러")
    void updateInformalSanction_InvalidState() {
        InformalSanctionDto dto = new InformalSanctionDto();
        dto.setIfmlAtrzId("SANC_01");
        
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvYn("C") // 승인 상태
                .build();
                
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of("APPLICANT_01"));

        assertThatThrownBy(() -> informalSanctionService.updateInformalSanction(dto))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_STATE);
    }

    @Test
    @DisplayName("deleteInformalSanction 테스트 - 성공")
    void deleteInformalSanction_Success() {
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvYn("A")
                .build();
                
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of("APPLICANT_01"));

        informalSanctionService.deleteInformalSanction("SANC_01");

        verify(informalSanctionRepository, times(1)).delete(entity);
    }

    @Test
    @DisplayName("deleteInformalSanction 테스트 - 권한 에러")
    void deleteInformalSanction_AccessDenied() {
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvYn("A")
                .build();
                
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of("OTHER_USER"));

        assertThatThrownBy(() -> informalSanctionService.deleteInformalSanction("SANC_01"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("비정형 결재 승인 성공 (정상 권한 및 상태)")
    void confirmInformalSanction_Success() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of(sanctionerId));

        informalSanctionService.confirmInformalSanction("SANC_01", SanctionStatus.APPROVED.getCode(), null);

        assertThat(entity.getAprvYn()).isEqualTo(SanctionStatus.APPROVED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("비정형 결재 반려 성공")
    void confirmInformalSanction_Reject() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of(sanctionerId));

        informalSanctionService.confirmInformalSanction("SANC_01", SanctionStatus.REJECTED.getCode(), "Reject Reason");

        assertThat(entity.getAprvYn()).isEqualTo(SanctionStatus.REJECTED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("비정형 결재 승인 실패 - 잘못된 상태 코드")
    void confirmInformalSanction_InvalidStatusCode() {
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of(sanctionerId));

        assertThatThrownBy(() -> informalSanctionService.confirmInformalSanction("SANC_01", "UNKNOWN", null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
    }
}
