package nuri.business.service.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.foundation.service.code.EgovCommonCodeService;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("InformalSanctionService 테스트")
class InformalSanctionServiceTest {

    @Mock
    private InformalSanctionRepository informalSanctionRepository;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @InjectMocks
    private InformalSanctionServiceImpl informalSanctionService;

    @Test
    @DisplayName("신청 목록 조회 테스트")
    void getInformalSanctionListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        InformalSanction sanction = InformalSanction.builder().informalSanctionId("IS1").build();
        given(informalSanctionRepository.findByApplicantId("user1", pageable)).willReturn(new PageImpl<>(List.of(sanction)));

        // When
        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList("user1", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("상세 조회 테스트 - 성공")
    void getInformalSanction_Success() {
        // Given
        InformalSanction sanction = InformalSanction.builder().informalSanctionId("IS1").jobSeCode("C1").build();
        given(informalSanctionRepository.findById("IS1")).willReturn(Optional.of(sanction));
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of());

        // When
        InformalSanctionDto result = informalSanctionService.getInformalSanction("IS1");

        // Then
        assertThat(result.getInformalSanctionId()).isEqualTo("IS1");
    }

    @Test
    @DisplayName("상세 조회 테스트 - 실패")
    void getInformalSanction_NotFound_ThrowsException() {
        // Given
        given(informalSanctionRepository.findById("IS1")).willReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> informalSanctionService.getInformalSanction("IS1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("결재 등록 테스트")
    void registerInformalSanctionTest() {
        // Given
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .informalSanctionId("IS1")
                .jobSeCode("C1")
                .build();

        // When
        informalSanctionService.registerInformalSanction(dto);

        // Then
        verify(informalSanctionRepository).save(any(InformalSanction.class));
    }

    @Test
    @DisplayName("결재 승인 처리 테스트")
    void confirmInformalSanctionTest() {
        // Given
        InformalSanction sanction = InformalSanction.builder().informalSanctionId("IS1").build();
        given(informalSanctionRepository.findById("IS1")).willReturn(Optional.of(sanction));

        // When
        informalSanctionService.confirmInformalSanction("IS1", "Y", "Reason");

        // Then
        assertThat(sanction.getConfmAt()).isEqualTo("Y");
    }
}
