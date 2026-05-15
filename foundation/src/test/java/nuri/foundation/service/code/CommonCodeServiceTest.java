package nuri.foundation.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.code.*;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.code.dto.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommonCodeService 단위 테스트")
class CommonCodeServiceTest {

    @Mock
    private CommonCodeRepository commonCodeRepository;

    @Mock
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @Mock
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @InjectMocks
    private CommonCodeService commonCodeService;

    @Test
    @DisplayName("그룹별 코드 목록 조회 테스트")
    void getCodesByGroupTest() {
        given(commonCodeRepository.findByCodeGroupIdAndUseYn(anyString(), anyString()))
                .willReturn(List.of(CommonCode.builder()
                        .codeGroupId("GRP1")
                        .code("CODE1")
                        .codeNm("코드명1")
                        .build()));

        List<CommonCodeDto> result = commonCodeService.getCodesByGroup("GRP1");

        assertEquals(1, result.size());
        assertEquals("CODE1", result.get(0).code());
    }

    @Test
    @DisplayName("코드 생성 테스트 - 성공")
    void createCodeSuccessTest() {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("GRP1", "CODE1", "코드명1", "설명", "Y");
        given(commonCodeRepository.findById(any())).willReturn(Optional.empty());
        given(commonCodeRepository.save(any(CommonCode.class))).willAnswer(invocation -> invocation.getArgument(0));

        CommonCodeDto result = commonCodeService.createCode(request);

        assertNotNull(result);
        assertEquals("CODE1", result.code());
    }

    @Test
    @DisplayName("코드 생성 테스트 - 중복 오류")
    void createCodeDuplicateTest() {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("GRP1", "CODE1", "코드명1", "설명", "Y");
        given(commonCodeRepository.findById(any())).willReturn(Optional.of(mock(CommonCode.class)));

        assertThrows(BusinessException.class, () -> commonCodeService.createCode(request));
    }

    @Test
    @DisplayName("공통분류코드 목록 조회 테스트")
    void selectCmmnClCodeListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        Page<CommonCodeCategory> page = new PageImpl<>(List.of(
                CommonCodeCategory.builder().clCode("CL1").clCodeNm("분류1").build()
        ));

        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnClCodeDto> result = commonCodeService.selectCmmnClCodeList(searchVO);

        assertEquals(1, result.size());
        assertEquals("CL1", result.get(0).getClCode());
    }

    @Test
    @DisplayName("공통분류코드 등록 테스트")
    void insertCmmnClCodeTest() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clCode("CL1").clCodeNm("분류1").build();
        given(commonCodeCategoryRepository.existsById("CL1")).willReturn(false);

        commonCodeService.insertCmmnClCode(dto);

        verify(commonCodeCategoryRepository).save(any());
    }

    @Test
    @DisplayName("공통코드(그룹) 목록 조회 테스트")
    void selectCmmnCodeListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        CommonCodeGroupProjection projection = mock(CommonCodeGroupProjection.class);
        given(projection.getCodeId()).willReturn("GRP1");
        
        Page<CommonCodeGroupProjection> page = new PageImpl<>(List.of(projection));
        given(commonCodeGroupRepository.searchCommonCodeGroups(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnCodeDto> result = commonCodeService.selectCmmnCodeList(searchVO);

        assertEquals(1, result.size());
        assertEquals("GRP1", result.get(0).getCodeId());
    }

    @Test
    @DisplayName("공통상세코드 목록 조회 테스트")
    void selectCmmnDetailCodeListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        CommonCodeDetailProjection projection = mock(CommonCodeDetailProjection.class);
        given(projection.getCode()).willReturn("DTL1");
        
        Page<CommonCodeDetailProjection> page = new PageImpl<>(List.of(projection));
        given(commonCodeRepository.searchCommonCodeDetails(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnDetailCodeDto> result = commonCodeService.selectCmmnDetailCodeList(searchVO);

        assertEquals(1, result.size());
        assertEquals("DTL1", result.get(0).getCode());
    }
}
