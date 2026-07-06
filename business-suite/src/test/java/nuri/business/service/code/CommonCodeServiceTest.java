package nuri.business.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.code.*;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.code.dto.*;
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
        given(commonCodeRepository.findByCdIdAndUseYn(anyString(), anyString()))
                .willReturn(List.of(CommonCode.builder()
                        .cdId("GRP1")
                        .dtlCd("CODE1")
                        .dtlCdNm("코드명1")
                        .build()));

        List<CommonCodeDto> result = commonCodeService.getCodesByGroup("GRP1");

        assertEquals(1, result.size());
        assertEquals("CODE1", result.get(0).dtlCd());
    }

    @Test
    @DisplayName("코드 생성 테스트 - 성공")
    void createCodeSuccessTest() {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("GRP1", "CODE1", "코드명1", "설명", "Y");
        given(commonCodeRepository.findById(any())).willReturn(Optional.empty());
        given(commonCodeRepository.save(any(CommonCode.class))).willAnswer(invocation -> invocation.getArgument(0));

        CommonCodeDto result = commonCodeService.createCode(request);

        assertNotNull(result);
        assertEquals("CODE1", result.dtlCd());
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
                CommonCodeCategory.builder().clsfCd("CL1").clsfCdNm("분류1").build()
        ));

        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnClCodeDto> result = commonCodeService.selectCmmnClCodeList(searchVO);

        assertEquals(1, result.size());
        assertEquals("CL1", result.get(0).getClsfCd());
    }

    @Test
    @DisplayName("공통분류코드 등록 테스트")
    void insertCmmnClCodeTest() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clsfCd("CL1").clsfCdNm("분류1").build();
        given(commonCodeCategoryRepository.existsById("CL1")).willReturn(false);

        commonCodeService.insertCmmnClCode(dto);

        verify(commonCodeCategoryRepository).save(any());
    }

    @Test
    @DisplayName("공통코드(그룹) 목록 조회 테스트")
    void selectCmmnCodeListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        CommonCodeGroupProjection projection = mock(CommonCodeGroupProjection.class);
        given(projection.getCdId()).willReturn("GRP1");
        
        Page<CommonCodeGroupProjection> page = new PageImpl<>(List.of(projection));
        given(commonCodeGroupRepository.searchCommonCodeGroups(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnCodeDto> result = commonCodeService.selectCmmnCodeList(searchVO);

        assertEquals(1, result.size());
        assertEquals("GRP1", result.get(0).getCdId());
    }

    @Test
    @DisplayName("공통상세코드 목록 조회 테스트")
    void selectCmmnDetailCodeListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        CommonCodeDetailProjection projection = mock(CommonCodeDetailProjection.class);
        given(projection.getDtlCd()).willReturn("DTL1");
        
        Page<CommonCodeDetailProjection> page = new PageImpl<>(List.of(projection));
        given(commonCodeRepository.searchCommonCodeDetails(any(), any(), any(Pageable.class)))
                .willReturn(page);

        List<CmmnDetailCodeDto> result = commonCodeService.selectCmmnDetailCodeList(searchVO);
        assertNotNull(result);
    }

    @Test
    @DisplayName("공통분류코드 전체 건수 조회")
    void selectCmmnClCodeListTotCntTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        @SuppressWarnings("unchecked")
        Page<CommonCodeCategory> page = mock(Page.class);
        given(page.getTotalElements()).willReturn(10L);
        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any(Pageable.class)))
                .willReturn(page);

        int count = commonCodeService.selectCmmnClCodeListTotCnt(searchVO);
        assertEquals(10, count);
    }

    @Test
    @DisplayName("공통분류코드 상세 조회")
    void selectCmmnClCodeDetailTest() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clsfCd("CL1").build();
        CommonCodeCategory entity = CommonCodeCategory.builder().clsfCd("CL1").build();
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(entity));

        CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(dto);
        assertNotNull(result);
        assertEquals("CL1", result.getClsfCd());
    }

    @Test
    @DisplayName("공통분류코드 수정")
    void updateCmmnClCodeTest() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clsfCd("CL1").clsfCdNm("Update").build();
        CommonCodeCategory entity = mock(CommonCodeCategory.class);
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(entity));

        commonCodeService.updateCmmnClCode(dto);
        verify(entity).update(eq("Update"), any(), any(), any());
    }

    @Test
    @DisplayName("공통분류코드 삭제")
    void deleteCmmnClCodeTest() {
        CmmnClCodeDto dto = CmmnClCodeDto.builder().clsfCd("CL1").build();
        CommonCodeCategory entity = mock(CommonCodeCategory.class);
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.of(entity));

        commonCodeService.deleteCmmnClCode(dto);
        verify(entity).delete();
    }

    @Test
    @DisplayName("공통코드 등록 - 중복 예외")
    void insertCmmnCodeDuplicateTest() {
        CmmnCodeDto dto = CmmnCodeDto.builder().cdId("GRP1").build();
        given(commonCodeGroupRepository.existsById("GRP1")).willReturn(true);

        assertThrows(BusinessException.class, () -> commonCodeService.insertCmmnCode(dto));
    }

    @Test
    @DisplayName("공통코드 상세 조회")
    void selectCmmnCodeDetailTest() {
        CmmnCodeDto dto = CmmnCodeDto.builder().cdId("GRP1").build();
        CommonCodeGroup entity = CommonCodeGroup.builder().cdId("GRP1").cdIdNm("Name").clsfCd("CL1").build();
        given(commonCodeGroupRepository.findById("GRP1")).willReturn(Optional.of(entity));
        given(commonCodeCategoryRepository.findById("CL1")).willReturn(Optional.empty());

        CmmnCodeDto result = commonCodeService.selectCmmnCodeDetail(dto);
        assertNotNull(result);
        assertEquals("GRP1", result.getCdId());
    }

    @Test
    @DisplayName("공통코드 수정")
    void updateCmmnCodeTest() {
        CmmnCodeDto dto = CmmnCodeDto.builder().cdId("GRP1").cdIdNm("Update").build();
        CommonCodeGroup entity = mock(CommonCodeGroup.class);
        given(commonCodeGroupRepository.findById("GRP1")).willReturn(Optional.of(entity));

        commonCodeService.updateCmmnCode(dto);
        verify(entity).update(eq("Update"), any(), any(), any());
    }

    @Test
    @DisplayName("공통코드 삭제")
    void deleteCmmnCodeTest() {
        CmmnCodeDto dto = CmmnCodeDto.builder().cdId("GRP1").build();
        CommonCodeGroup entity = mock(CommonCodeGroup.class);
        given(commonCodeGroupRepository.findById("GRP1")).willReturn(Optional.of(entity));

        commonCodeService.deleteCmmnCode(dto);
        verify(entity).delete();
    }

    @Test
    @DisplayName("공통상세코드 전체 건수 조회")
    void selectCmmnDetailCodeListTotCntTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        @SuppressWarnings("unchecked")
        Page<nuri.business.domain.code.CommonCodeDetailProjection> page = mock(Page.class);
        given(page.getTotalElements()).willReturn(20L);
        given(commonCodeRepository.searchCommonCodeDetails(any(), any(), any(Pageable.class))).willReturn(page);

        int count = commonCodeService.selectCmmnDetailCodeListTotCnt(searchVO);
        assertEquals(20, count);
    }

    @Test
    @DisplayName("공통상세코드 상세 조회")
    void selectCmmnDetailCodeDetailTest() {
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().cdId("GRP1").dtlCd("CD1").build();
        CommonCode entity = CommonCode.builder().cdId("GRP1").dtlCd("CD1").dtlCdNm("Name").build();
        CommonCodeId id = new CommonCodeId("GRP1", "CD1");
        given(commonCodeRepository.findById(id)).willReturn(Optional.of(entity));

        CmmnDetailCodeDto result = commonCodeService.selectCmmnDetailCodeDetail(dto);
        assertNotNull(result);
        assertEquals("CD1", result.getDtlCd());
    }

    @Test
    @DisplayName("공통상세코드 등록 - 성공")
    void insertCmmnDetailCodeSuccessTest() {
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().cdId("GRP1").dtlCd("CD1").dtlCdNm("Code 1").build();
        CommonCodeId id = new CommonCodeId("GRP1", "CD1");
        given(commonCodeRepository.existsById(id)).willReturn(false);

        commonCodeService.insertCmmnDetailCode(dto);
        verify(commonCodeRepository).save(any(CommonCode.class));
    }

    @Test
    @DisplayName("공통상세코드 수정")
    void updateCmmnDetailCodeTest() {
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().cdId("GRP1").dtlCd("CD1").dtlCdNm("Update").build();
        CommonCode entity = mock(CommonCode.class);
        CommonCodeId id = new CommonCodeId("GRP1", "CD1");
        given(commonCodeRepository.findById(id)).willReturn(Optional.of(entity));

        commonCodeService.updateCmmnDetailCode(dto);
        verify(entity).update(eq("Update"), any(), any(), any());
    }

    @Test
    @DisplayName("공통상세코드 삭제")
    void deleteCmmnDetailCodeTest() {
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder().cdId("GRP1").dtlCd("CD1").build();
        CommonCode entity = mock(CommonCode.class);
        CommonCodeId id = new CommonCodeId("GRP1", "CD1");
        given(commonCodeRepository.findById(id)).willReturn(Optional.of(entity));

        commonCodeService.deleteCmmnDetailCode(dto);
        verify(entity).delete();
    }
}
