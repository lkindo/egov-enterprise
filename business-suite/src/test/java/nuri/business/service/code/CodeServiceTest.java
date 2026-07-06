package nuri.business.service.code;

import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.service.code.dto.CodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CodeService 단위 테스트")
class CodeServiceTest {

    @Mock
    private CommonCodeRepository commonCodeRepository;

    @InjectMocks
    private CodeService codeService;

    @Test
    @DisplayName("생성자 주입 시 리포지토리가 null인 경우 IllegalArgumentException 발생 검증")
    void constructor_WhenRepositoryIsNull_ShouldThrowIllegalArgumentException() {
        assertThatThrownBy(() -> new CodeService(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("commonCodeRepository 은 null 일 수 없습니다");
    }

    @Test
    @DisplayName("특정 코드그룹 ID 조회 시 DTO 변환 및 사용 여부 'Y' 필터링 검증")
    void getDetailCodeList_ShouldReturnMappedDtoList() {
        // given
        String codeGroupId = "COM001";
        CommonCode code1 = CommonCode.builder()
                .cdId(codeGroupId)
                .dtlCd("C01")
                .dtlCdNm("코드1")
                .dtlCdExpln("코드1 설명")
                .useYn("Y")
                .build();
        CommonCode code2 = CommonCode.builder()
                .cdId(codeGroupId)
                .dtlCd("C02")
                .dtlCdNm("코드2")
                .dtlCdExpln("코드2 설명")
                .useYn("Y")
                .build();

        given(commonCodeRepository.findByCdIdAndUseYn(codeGroupId, "Y"))
                .willReturn(List.of(code1, code2));

        // when
        List<CodeDto> result = codeService.getDetailCodeList(codeGroupId);

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCodeGroupId()).isEqualTo(codeGroupId);
        assertThat(result.get(0).getCode()).isEqualTo("C01");
        assertThat(result.get(0).getCodeNm()).isEqualTo("코드1");
        assertThat(result.get(0).getCodeDc()).isEqualTo("코드1 설명");
        assertThat(result.get(0).getUseYn()).isEqualTo("Y");

        assertThat(result.get(1).getCode()).isEqualTo("C02");
        assertThat(result.get(1).getCodeNm()).isEqualTo("코드2");
        assertThat(result.get(1).getUseYn()).isEqualTo("Y");

        verify(commonCodeRepository, times(1)).findByCdIdAndUseYn(codeGroupId, "Y");
    }

    @Test
    @DisplayName("특정 코드그룹 ID 조회 시 codeGroupId가 null인 경우 IllegalArgumentException 발생 검증")
    void getDetailCodeList_WhenCodeGroupIdIsNull_ShouldThrowIllegalArgumentException() {
        assertThatThrownBy(() -> codeService.getDetailCodeList(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("codeGroupId 는 null 일 수 없습니다");
    }

    @Test
    @DisplayName("전체 활성 코드 조회 시 'Y'인 항목만 필터링하여 DTO 목록 반환 검증")
    void getAllActiveCodes_ShouldFilterActiveCodesOnly() {
        // given
        CommonCode code1 = CommonCode.builder()
                .cdId("COM001")
                .dtlCd("C01")
                .dtlCdNm("활성코드")
                .useYn("Y")
                .build();
        CommonCode code2 = CommonCode.builder()
                .cdId("COM001")
                .dtlCd("C02")
                .dtlCdNm("비활성코드")
                .useYn("N")
                .build();
        CommonCode code3 = CommonCode.builder()
                .cdId("COM002")
                .dtlCd("C03")
                .dtlCdNm("다른활성코드")
                .useYn("Y")
                .build();

        given(commonCodeRepository.findAll()).willReturn(List.of(code1, code2, code3));

        // when
        List<CodeDto> result = codeService.getAllActiveCodes();

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCode()).isEqualTo("C01");
        assertThat(result.get(0).getUseYn()).isEqualTo("Y");
        assertThat(result.get(1).getCode()).isEqualTo("C03");
        assertThat(result.get(1).getUseYn()).isEqualTo("Y");

        verify(commonCodeRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("리포지토리가 비어있을 때 빈 목록 반환 검증")
    void getAllActiveCodes_WhenEmpty_ShouldReturnEmptyList() {
        // given
        given(commonCodeRepository.findAll()).willReturn(Collections.emptyList());

        // when
        List<CodeDto> result = codeService.getAllActiveCodes();

        // then
        assertThat(result).isEmpty();
        verify(commonCodeRepository, times(1)).findAll();
    }
}
