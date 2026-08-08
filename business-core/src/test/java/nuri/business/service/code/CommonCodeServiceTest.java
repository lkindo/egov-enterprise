package nuri.business.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.code.*;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.code.dto.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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

    // 실제 MapStruct 생성 구현체를 @InjectMocks 생성자에 공급(from() 대체 매퍼 검증).
    @Spy
    private CommonCodeMapper commonCodeMapper = new CommonCodeMapperImpl();

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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] 아래는 PIT 이 살려 보낸 뮤턴트를 정확히 겨냥한다.
    //   측정값: nuri.business.{service.code,domain.log,service.deptjob} 스코어 61%(113/186).
    //   CommonCodeService 단독으로 미제거 24개 — 그중 페이징 9개와 계층검증 8개가 여기 대상이다.
    //
    //   ⚠ 왜 기존 테스트가 못 잡았나: 종전 목록 테스트는 "결과 1건이 돌아온다" 만 봤다.
    //   그러면 pageIndex 계산을 `-1` 에서 `+1` 로 바꿔도, `> 0` 을 `>= 0` 으로 바꿔도
    //   목(mock)이 같은 Page 를 돌려주므로 **테스트가 통과한다.**
    //   경계를 검증하려면 서비스가 만든 Pageable 을 붙잡아 그 값을 확인해야 한다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 서비스가 저장소에 넘긴 Pageable 을 캡처한다 — 페이징 계산의 유일한 관측 지점이다. */
    private Pageable captureCategoryPageable(BaseSearchDto searchVO) {
        given(commonCodeCategoryRepository.searchCommonCodeCategories(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));
        commonCodeService.selectCmmnClCodeList(searchVO);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(commonCodeCategoryRepository).searchCommonCodeCategories(any(), any(), captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("페이징: pageIndex 는 1-based → 0-based 로 변환된다 (3페이지 → offset 2)")
    void pagingConvertsOneBasedIndexToZeroBased() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(3);
        searchVO.setPageUnit(10);

        Pageable pageable = captureCategoryPageable(searchVO);

        // `-1` 을 `+1` 로 바꾼 뮤턴트는 4 가 되어 여기서 죽는다.
        assertEquals(2, pageable.getPageNumber(), "1-based 3페이지는 0-based 2여야 한다");
    }

    @Test
    @DisplayName("페이징: pageIndex 0·음수는 0으로 눌린다 (Math.max 경계)")
    void pagingClampsNonPositiveIndexToZero() {
        BaseSearchDto first = new BaseSearchDto();
        first.setPageIndex(1);
        assertEquals(0, captureCategoryPageable(first).getPageNumber(), "1페이지는 offset 0");

        // Math.max(0, ...) 가 없으면 PageRequest.of 가 IllegalArgumentException 을 던진다.
        // 즉 이 단언은 클램프가 실제로 동작함을 증명한다.
        reset(commonCodeCategoryRepository);
        BaseSearchDto zero = new BaseSearchDto();
        zero.setPageIndex(0);
        assertEquals(0, captureCategoryPageable(zero).getPageNumber(), "0페이지도 offset 0 으로 눌려야 한다");
    }

    @Test
    @DisplayName("페이징: pageUnit 이 0 이하면 기본값 10 으로 대체된다 (조건 경계)")
    void pagingFallsBackToDefaultUnitWhenNonPositive() {
        BaseSearchDto zero = new BaseSearchDto();
        zero.setPageUnit(0);
        // `> 0` 을 `>= 0` 으로 바꾼 뮤턴트는 0 을 그대로 써 PageRequest 가 터진다 → 죽는다.
        assertEquals(10, captureCategoryPageable(zero).getPageSize(), "pageUnit 0 이면 기본 10");

        reset(commonCodeCategoryRepository);
        BaseSearchDto positive = new BaseSearchDto();
        positive.setPageUnit(25);
        // 조건을 뒤집은 뮤턴트는 25 를 무시하고 10 을 써 여기서 죽는다.
        assertEquals(25, captureCategoryPageable(positive).getPageSize(), "양수 pageUnit 은 그대로 쓴다");
    }

    // ── updateCmmnCodeHierarchy: 검증 분기 5개가 전부 미커버(NO_COVERAGE)였다 ──

    @Test
    @DisplayName("계층 변경: null·빈 목록은 조용히 통과한다 (저장소 접근 없음)")
    void updateHierarchyIgnoresNullAndEmpty() {
        commonCodeService.updateCmmnCodeHierarchy(null);
        commonCodeService.updateCmmnCodeHierarchy(List.of());
        verifyNoInteractions(commonCodeGroupRepository);
    }

    @Test
    @DisplayName("계층 변경: cdId 가 비면 거부한다")
    void updateHierarchyRejectsBlankCodeId() {
        List<CmmnCodeHierarchyDto> items = List.of(
                CmmnCodeHierarchyDto.builder().cdId("  ").clsfCd("CL1").build());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> commonCodeService.updateCmmnCodeHierarchy(items));
        assertTrue(ex.getMessage().contains("코드 ID"), "cdId 누락 사유가 드러나야 한다");
    }

    @Test
    @DisplayName("계층 변경: clsfCd 가 비면 거부한다 — 루트 이동은 조용한 데이터 유실이다")
    void updateHierarchyRejectsBlankClassification() {
        List<CmmnCodeHierarchyDto> items = List.of(
                CmmnCodeHierarchyDto.builder().cdId("CD1").clsfCd("").build());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> commonCodeService.updateCmmnCodeHierarchy(items));
        assertTrue(ex.getMessage().contains("분류코드"), "분류 소속 강제 사유가 드러나야 한다");
    }

    @Test
    @DisplayName("계층 변경: 자기 자신을 상위로 지정하면 거부한다")
    void updateHierarchyRejectsSelfReference() {
        List<CmmnCodeHierarchyDto> items = List.of(
                CmmnCodeHierarchyDto.builder().cdId("SAME").clsfCd("SAME").build());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> commonCodeService.updateCmmnCodeHierarchy(items));
        assertTrue(ex.getMessage().contains("자기 자신"), "자기참조 사유가 드러나야 한다");
    }

    @Test
    @DisplayName("계층 변경: 존재하지 않는 상위 분류는 거부한다 (유령 부모 차단)")
    void updateHierarchyRejectsMissingParent() {
        given(commonCodeCategoryRepository.existsById("GHOST")).willReturn(false);
        List<CmmnCodeHierarchyDto> items = List.of(
                CmmnCodeHierarchyDto.builder().cdId("CD1").clsfCd("GHOST").build());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> commonCodeService.updateCmmnCodeHierarchy(items));
        assertTrue(ex.getMessage().contains("상위 분류코드가 존재하지 않습니다"));
    }

    @Test
    @DisplayName("계층 변경: 코드그룹이 없으면 거부한다")
    void updateHierarchyRejectsMissingCodeGroup() {
        given(commonCodeCategoryRepository.existsById("CL1")).willReturn(true);
        given(commonCodeGroupRepository.findById("NOPE")).willReturn(Optional.empty());
        List<CmmnCodeHierarchyDto> items = List.of(
                CmmnCodeHierarchyDto.builder().cdId("NOPE").clsfCd("CL1").build());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> commonCodeService.updateCmmnCodeHierarchy(items));
        assertTrue(ex.getMessage().contains("코드그룹이 존재하지 않습니다"));
    }

    @Test
    @DisplayName("계층 변경: 정상 입력은 엔티티의 분류를 실제로 갱신한다")
    void updateHierarchyAppliesClassification() {
        CommonCodeGroup entity = mock(CommonCodeGroup.class);
        given(commonCodeCategoryRepository.existsById("CL9")).willReturn(true);
        given(commonCodeGroupRepository.findById("CD9")).willReturn(Optional.of(entity));

        commonCodeService.updateCmmnCodeHierarchy(List.of(
                CmmnCodeHierarchyDto.builder().cdId("CD9").clsfCd("CL9").build()));

        // `removed call to updateClassification` 뮤턴트는 여기서 죽는다.
        verify(entity).updateClassification("CL9");
    }

    // ── 페이징 로직은 세 메서드에 복제돼 있다. 하나만 검증하면 나머지 두 곳의 뮤턴트가 산다. ──

    @Test
    @DisplayName("페이징(코드그룹): pageIndex·pageUnit 변환이 동일하게 적용된다")
    void codeGroupListAppliesSamePagingRule() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(5);
        vo.setPageUnit(0);   // 0 -> 기본 10

        given(commonCodeGroupRepository.searchCommonCodeGroups(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));
        commonCodeService.selectCmmnCodeList(vo);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(commonCodeGroupRepository).searchCommonCodeGroups(any(), any(), captor.capture());
        assertEquals(4, captor.getValue().getPageNumber(), "1-based 5페이지는 0-based 4");
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }

    @Test
    @DisplayName("페이징(상세코드): pageIndex·pageUnit 변환이 동일하게 적용된다")
    void detailCodeListAppliesSamePagingRule() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(2);
        vo.setPageUnit(50);

        given(commonCodeRepository.searchCommonCodeDetails(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));
        List<CmmnDetailCodeDto> result = commonCodeService.selectCmmnDetailCodeList(vo);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(commonCodeRepository).searchCommonCodeDetails(any(), any(), captor.capture());
        assertEquals(1, captor.getValue().getPageNumber(), "1-based 2페이지는 0-based 1");
        assertEquals(50, captor.getValue().getPageSize());
        // `replaced return value with Collections.emptyList` 뮤턴트를 잡기 위해
        // 반환이 저장소 결과에서 유래함을 확인한다(빈 Page -> 빈 결과).
        assertNotNull(result, "결과는 null 이 아니어야 한다");
        assertTrue(result.isEmpty(), "빈 Page 는 빈 목록으로 매핑된다");
    }

    @Test
    @DisplayName("총건수: 저장소가 보고한 totalElements 를 그대로 돌려준다 (0 고정 아님)")
    void codeGroupTotalCountReflectsRepository() {
        given(commonCodeGroupRepository.searchCommonCodeGroups(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 137));
        // `replaced int return with 0` 뮤턴트는 여기서 죽는다.
        assertEquals(137, commonCodeService.selectCmmnCodeListTotCnt(new BaseSearchDto()));
    }
}
