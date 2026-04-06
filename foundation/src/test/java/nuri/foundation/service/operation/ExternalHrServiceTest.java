package nuri.foundation.service.operation;

import nuri.foundation.domain.operation.ExternalHr;
import nuri.foundation.repository.operation.ExternalHrRepository;
import nuri.foundation.service.operation.dto.ExternalHrDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExternalHrService (외부 인력 관리) 테스트")
class ExternalHrServiceTest {

    @Mock
    private ExternalHrRepository externalHrRepository;

    @InjectMocks
    private ExternalHrService externalHrService;

    @Test
    @DisplayName("외부 인력 전체 조회")
    void getAllExternalHr_Success() {
        // Given
        ExternalHr entity = ExternalHr.builder().extrlHrId("HR1").extrlHrNm("Name").build();
        given(externalHrRepository.findAll()).willReturn(List.of(entity));

        // When
        List<ExternalHrDto> result = externalHrService.getAllExternalHr();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getExtrlHrNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("이름으로 외부 인력 검색")
    void searchByName_Success() {
        // Given
        ExternalHr entity = ExternalHr.builder().extrlHrId("HR1").extrlHrNm("Tester").build();
        given(externalHrRepository.findByExtrlHrNmContaining("Test")).willReturn(List.of(entity));

        // When
        List<ExternalHrDto> result = externalHrService.searchByName("Test");

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("외부 인력 등록")
    void createExternalHr_Success() {
        // Given
        ExternalHrDto dto = ExternalHrDto.builder().extrlHrNm("New").build();
        ExternalHr savedEntity = ExternalHr.builder().extrlHrId("HR2").extrlHrNm("New").build();
        given(externalHrRepository.save(any(ExternalHr.class))).willReturn(savedEntity);

        // When
        ExternalHrDto result = externalHrService.createExternalHr(dto);

        // Then
        assertThat(result.getExtrlHrId()).isEqualTo("HR2");
    }
}
