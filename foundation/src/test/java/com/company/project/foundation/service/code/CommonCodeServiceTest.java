package com.company.project.foundation.service.code;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.domain.code.*;
import com.company.project.foundation.service.code.dto.*;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

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
        ComDefaultVO vo = new ComDefaultVO();
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
}
