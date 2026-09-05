package nuri.business.service.operation;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.operation.ExternalHrId;
import java.util.Optional;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.domain.operation.ExternalHrRepository;
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
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("Name").build();
        given(externalHrRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = externalHrService.getExternalHrList(null, PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getEvntSn()).isEqualTo(1L);
        assertThat(result.getContent().get(0).getOtsdHrNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("이름으로 외부 인력 검색 - 페이징")
    void getExternalHrList_SearchByName() {
        // Given
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("Tester").build();
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
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(2L).otsdHrId("HR2").otsdHrNm("New").build();
        ExternalHr savedEntity = ExternalHr.builder().evntSn(2L).otsdHrId("HR2").otsdHrNm("New").build();
        given(externalHrRepository.save(any(ExternalHr.class))).willReturn(savedEntity);

        // When
        ExternalHrDto result = externalHrService.createExternalHr(dto);

        // Then
        assertThat(result.getOtsdHrId()).isEqualTo("HR2");
        assertThat(result.getEvntSn()).isEqualTo(2L);
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로 — 종전에는 등록만 되고 고칠 수 없었다.
    @Test
    @DisplayName("외부 인력 수정 — 식별자는 두고 정보만 갱신하며, 수정자는 인증 주체(없으면 요청값)")
    void updateExternalHr_Success() {
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("Old").emlAddr("old@example.com").build();
        given(externalHrRepository.findById(new ExternalHrId(1L, "HR1"))).willReturn(Optional.of(entity));
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(99L).otsdHrId("IGNORED").otsdHrNm("New")
                .ogdpInstNm("기관").emlAddr("new@example.com").lastMdfrId("editor").build();

        ExternalHrDto result = externalHrService.updateExternalHr(1L, "HR1", dto);

        assertThat(result.getEvntSn()).isEqualTo(1L);
        assertThat(result.getOtsdHrId()).isEqualTo("HR1");
        assertThat(result.getOtsdHrNm()).isEqualTo("New");
        assertThat(result.getOgdpInstNm()).isEqualTo("기관");
        assertThat(result.getEmlAddr()).isEqualTo("new@example.com");
        assertThat(entity.getLastMdfrId()).isEqualTo("editor");
    }

    @Test
    @DisplayName("외부 인력 삭제")
    void deleteExternalHr_Success() {
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").build();
        given(externalHrRepository.findById(new ExternalHrId(1L, "HR1"))).willReturn(Optional.of(entity));

        externalHrService.deleteExternalHr(1L, "HR1");

        verify(externalHrRepository).delete(entity);
    }

    @Test
    @DisplayName("없는 외부 인력의 수정·삭제는 RESOURCE_NOT_FOUND — 조용히 성공하지 않는다")
    void updateOrDelete_NotFound() {
        given(externalHrRepository.findById(any(ExternalHrId.class))).willReturn(Optional.empty());

        assertThatThrownBy(() -> externalHrService.updateExternalHr(9L, "NONE", ExternalHrDto.builder().build()))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> externalHrService.deleteExternalHr(9L, "NONE"))
                .isInstanceOf(BusinessException.class);
        verify(externalHrRepository, never()).delete(any(ExternalHr.class));
    }
}
