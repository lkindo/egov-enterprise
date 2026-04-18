package nuri.foundation.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.code.*;
import nuri.foundation.service.code.dto.*;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("CommonCodeService 단위 테스트")
class CommonCodeServiceTest {

    @InjectMocks
    private CommonCodeService commonCodeService;

    @Mock
    private CommonCodeRepository commonCodeRepository;
    @Mock
    private CommonCodeCategoryRepository commonCodeCategoryRepository;
    @Mock
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Test
    @DisplayName("그룹 ID로 코드 목록 조회")
    void getCodesByGroup() {
        CommonCode code = CommonCode.builder().codeGroupId("G1").code("C1").codeNm("Name").useAt("Y").build();
        given(commonCodeRepository.findByCodeGroupIdAndUseAt("G1", "Y")).willReturn(List.of(code));

        List<CommonCodeDto> result = commonCodeService.getCodesByGroup("G1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("C1");
    }

    @Test
    @DisplayName("코드 생성 - 성공")
    void createCode_Success() {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("G1", "C1", "Name", "Desc", "Y");
        given(commonCodeRepository.findById(any(CommonCodeId.class))).willReturn(Optional.empty());
        given(commonCodeRepository.save(any(CommonCode.class))).willAnswer(inv -> inv.getArgument(0));

        CommonCodeDto result = commonCodeService.createCode(request);

        assertThat(result.code()).isEqualTo("C1");
        verify(commonCodeRepository).save(any(CommonCode.class));
    }

    @Test
    @DisplayName("코드 생성 - 실패 (중복)")
    void createCode_Fail_Duplicate() {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("G1", "C1", "Name", "Desc", "Y");
        given(commonCodeRepository.findById(any(CommonCodeId.class))).willReturn(Optional.of(mock(CommonCode.class)));

        assertThrows(BusinessException.class, () -> commonCodeService.createCode(request));
    }

    // --- 분류코드 (Category) 테스트 ---

    @Test
    @DisplayName("분류코드 목록 조회")
    void selectCmmnClCodeList() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(1);
        CommonCodeCategory category = CommonCodeCategory.builder().clCode("CL1").clCodeNm("Name").build();
        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any())).willReturn(new PageImpl<>(List.of(category)));

        List<CmmnClCodeDto> list = commonCodeService.selectCmmnClCodeList(vo);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getClCode()).isEqualTo("CL1");
    }

    @Test
    @DisplayName("분류코드 등록")
    void insertCmmnClCode() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clCode("CL1").clCodeNm("Name").build();
        given(commonCodeCategoryRepository.existsById("CL1")).willReturn(false);

        commonCodeService.insertCmmnClCode(dto);

        verify(commonCodeCategoryRepository).save(any(CommonCodeCategory.class));
    }

    // --- 코드그룹 (Group) 테스트 ---

    @Test
    @DisplayName("코드그룹 상세 조회")
    void selectCmmnCodeDetail() {
        CommonCodeGroup group = CommonCodeGroup.builder().codeId("G1").codeIdNm("Name").clCode("CL1").build();
        given(commonCodeGroupRepository.findById("G1")).willReturn(Optional.of(group));
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(CommonCodeCategory.builder().clCodeNm("ClName").build()));

        CmmnCodeDto result = commonCodeService.selectCmmnCodeDetail(CmmnCodeDto.builder().codeId("G1").build());

        assertThat(result).isNotNull();
        assertThat(result.getCodeIdNm()).isEqualTo("Name");
    }

    // --- 상세코드 (Detail) 테스트 ---

    @Test
    @DisplayName("상세코드 등록")
    void insertCmmnDetailCode() {
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().codeId("G1").code("C1").codeNm("Name").build();
        given(commonCodeRepository.existsById(any(CommonCodeId.class))).willReturn(false);

        commonCodeService.insertCmmnDetailCode(dto);

        verify(commonCodeRepository).save(any(CommonCode.class));
    }

    @Test
    @DisplayName("상세코드 수정")
    void updateCmmnDetailCode() {
        CommonCode code = CommonCode.builder().codeGroupId("G1").code("C1").codeNm("Old").build();
        given(commonCodeRepository.findById(any(CommonCodeId.class))).willReturn(Optional.of(code));

        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().codeId("G1").code("C1").codeNm("New").build();
        commonCodeService.updateCmmnDetailCode(dto);

        assertThat(code.getCodeNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("분류코드 토탈 카운트 조회")
    void selectCmmnClCodeListTotCnt() {
        BaseSearchDto vo = new BaseSearchDto();
        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any())).willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 5));

        int cnt = commonCodeService.selectCmmnClCodeListTotCnt(vo);

        assertThat(cnt).isEqualTo(5);
    }

    @Test
    @DisplayName("분류코드 상세 조회")
    void selectCmmnClCodeDetail() {
        CommonCodeCategory category = CommonCodeCategory.builder().clCode("CL1").clCodeNm("Name").build();
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(category));

        CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(CmmnClCodeDto.builder().clCode("CL1").build());

        assertThat(result).isNotNull();
        assertThat(result.getClCodeNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("분류코드 수정")
    void updateCmmnClCode() {
        CommonCodeCategory category = CommonCodeCategory.builder().clCode("CL1").clCodeNm("Old").build();
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(category));

        CmmnClCodeDto dto = CmmnClCodeDto.builder().clCode("CL1").clCodeNm("New").lastUpdusrId("user1").build();
        commonCodeService.updateCmmnClCode(dto);

        assertThat(category.getClCodeNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("분류코드 삭제")
    void deleteCmmnClCode() {
        CommonCodeCategory category = CommonCodeCategory.builder().clCode("CL1").build();
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(category));

        commonCodeService.deleteCmmnClCode(CmmnClCodeDto.builder().clCode("CL1").build());

        assertThat(category.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("코드그룹 목록 조회")
    void selectCmmnCodeList() {
        BaseSearchDto vo = new BaseSearchDto();
        CommonCodeGroupProjection projection = mock(CommonCodeGroupProjection.class);
        given(projection.getCodeId()).willReturn("G1");
        given(commonCodeGroupRepository.searchCommonCodeGroups(any(), any(), any())).willReturn(new PageImpl<>(List.of(projection)));

        List<CmmnCodeDto> result = commonCodeService.selectCmmnCodeList(vo);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCodeId()).isEqualTo("G1");
    }

    @Test
    @DisplayName("코드그룹 등록")
    void insertCmmnCode() {
        CmmnCodeDto dto = CmmnCodeDto.builder().codeId("G1").codeIdNm("Name").clCode("CL1").build();
        given(commonCodeGroupRepository.existsById("G1")).willReturn(false);

        commonCodeService.insertCmmnCode(dto);

        verify(commonCodeGroupRepository).save(any(CommonCodeGroup.class));
    }

    @Test
    @DisplayName("코드그룹 삭제")
    void deleteCmmnCode() {
        CommonCodeGroup group = CommonCodeGroup.builder().codeId("G1").codeIdNm("Name").build();
        given(commonCodeGroupRepository.findById("G1")).willReturn(Optional.of(group));

        commonCodeService.deleteCmmnCode(CmmnCodeDto.builder().codeId("G1").build());

        assertThat(group.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("상세코드 목록 조회")
    void selectCmmnDetailCodeList() {
        BaseSearchDto vo = new BaseSearchDto();
        CommonCodeDetailProjection projection = mock(CommonCodeDetailProjection.class);
        given(projection.getCode()).willReturn("C1");
        given(commonCodeRepository.searchCommonCodeDetails(any(), any(), any())).willReturn(new PageImpl<>(List.of(projection)));

        List<CmmnDetailCodeDto> result = commonCodeService.selectCmmnDetailCodeList(vo);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("C1");
    }

    @Test
    @DisplayName("상세코드 삭제")
    void deleteCmmnDetailCode() {
        CommonCode code = CommonCode.builder().codeGroupId("G1").code("C1").codeNm("Name").build();
        given(commonCodeRepository.findById(any(CommonCodeId.class))).willReturn(Optional.of(code));

        commonCodeService.deleteCmmnDetailCode(CmmnDetailCodeDto.builder().codeId("G1").code("C1").build());

        assertThat(code.getUseAt()).isEqualTo("N");
    }
}
