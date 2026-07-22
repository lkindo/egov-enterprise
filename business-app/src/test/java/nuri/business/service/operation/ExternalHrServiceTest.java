package nuri.business.service.operation;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.repository.operation.ExternalHrRepository;
import nuri.business.service.operation.dto.ExternalHrDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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

    private static final Pageable PAGEABLE = PageRequest.of(0, 10);

    @Test
    @DisplayName("외부 인력 전체 조회 - 페이징")
    void getExternalHrList_Success() {
        // Given
        ExternalHr entity = ExternalHr.builder().otsdHrId("HR1").otsdHrNm("Name").build();
        given(externalHrRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = externalHrService.getExternalHrList(null, PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getOtsdHrNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("이름으로 외부 인력 검색 - 페이징")
    void getExternalHrList_SearchByName() {
        // Given
        ExternalHr entity = ExternalHr.builder().otsdHrId("HR1").otsdHrNm("Tester").build();
        given(externalHrRepository.findByOtsdHrNmContaining("Test", PAGEABLE))
                .willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = externalHrService.getExternalHrList("Test", PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("외부 인력 등록")
    void createExternalHr_Success() {
        // Given
        ExternalHrDto dto = ExternalHrDto.builder().otsdHrNm("New").build();
        ExternalHr savedEntity = ExternalHr.builder().otsdHrId("HR2").otsdHrNm("New").build();
        given(externalHrRepository.save(any(ExternalHr.class))).willReturn(savedEntity);

        // When
        ExternalHrDto result = externalHrService.createExternalHr(dto);

        // Then
        assertThat(result.getOtsdHrId()).isEqualTo("HR2");
    }
}
