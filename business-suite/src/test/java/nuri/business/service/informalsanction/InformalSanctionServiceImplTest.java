package nuri.business.service.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.foundation.service.code.EgovCommonCodeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.foundation.security.util.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.MockedStatic;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
    @DisplayName("비정형 결재 승인 성공 (정상 권한 및 상태)")
    void confirmInformalSanction_Success() {
        // given
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aplcntId("APPLICANT_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of(sanctionerId));

        // when
        informalSanctionService.confirmInformalSanction("SANC_01", SanctionStatus.APPROVED.getCode(), null);

        // then
        assertThat(entity.getAprvYn()).isEqualTo(SanctionStatus.APPROVED.getCode());
        verify(eventPublisher, times(1)).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("비정형 결재 승인 실패 - 권한 없음")
    void confirmInformalSanction_AccessDenied() {
        // given
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aprvrId("SANCTNER_01")
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of("OTHER_USER"));

        // when & then
        assertThatThrownBy(() -> informalSanctionService.confirmInformalSanction("SANC_01", SanctionStatus.APPROVED.getCode(), null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("비정형 결재 승인 실패 - 이미 처리된 상태")
    void confirmInformalSanction_InvalidState() {
        // given
        String sanctionerId = "SANCTNER_01";
        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId("SANC_01")
                .aprvrId(sanctionerId)
                .aprvYn(SanctionStatus.APPROVED.getCode())
                .build();
        
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(Optional.of(sanctionerId));

        // when & then
        assertThatThrownBy(() -> informalSanctionService.confirmInformalSanction("SANC_01", SanctionStatus.APPROVED.getCode(), null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_STATE);
    }
}
