package nuri.api.controller.foundation.controller.code;

import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnCodeHierarchyDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@Tag(name = "Common Code", description = "공통코드 관리 API")
@RestController
@RequestMapping("/api/v1/admin/system/codes")
@RequiredArgsConstructor
public class CommonCodeApiController {

    private final CommonCodeService commonCodeService;

    // --- Classification Code (분류코드) ---

    @Operation(summary = "분류코드 목록 조회")
    @GetMapping("/cl")
    public ResponseEntity<ApiResponse<PageResponse<CmmnClCodeDto>>> getClCodeList(@ModelAttribute BaseSearchDto searchVO) throws Exception {
        List<CmmnClCodeDto> list = commonCodeService.selectCmmnClCodeList(searchVO);
        int total = commonCodeService.selectCmmnClCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "분류코드 상세 조회")
    @GetMapping("/cl/{clCode}")
    public ResponseEntity<ApiResponse<CmmnClCodeDto>> getClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClsfCd(clCode);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnClCodeDetail(vo)));
    }

    @Operation(summary = "분류코드 등록")
    @PostMapping("/cl")
    public ResponseEntity<ApiResponse<Void>> createClCode(@Valid @RequestBody CmmnClCodeDto vo) throws Exception {
        commonCodeService.insertCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "분류코드 수정")
    @PutMapping("/cl/{clCode}")
    public ResponseEntity<ApiResponse<Void>> updateClCode(@PathVariable String clCode, @Valid @RequestBody CmmnClCodeDto vo) throws Exception {
        vo.setClsfCd(clCode);
        commonCodeService.updateCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "분류코드 삭제")
    @DeleteMapping("/cl/{clCode}")
    public ResponseEntity<ApiResponse<Void>> deleteClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClsfCd(clCode);
        commonCodeService.deleteCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Common Code (공통코드) ---

    @Operation(summary = "공통코드 목록 조회")
    @GetMapping("/cmmn")
    public ResponseEntity<ApiResponse<PageResponse<CmmnCodeDto>>> getCmmnCodeList(@ModelAttribute BaseSearchDto searchVO) throws Exception {
        List<CmmnCodeDto> list = commonCodeService.selectCmmnCodeList(searchVO);
        int total = commonCodeService.selectCmmnCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "공통코드 상세 조회")
    @GetMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<CmmnCodeDto>> getCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCdId(codeId);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnCodeDetail(vo)));
    }

    @Operation(summary = "공통코드 등록")
    @PostMapping("/cmmn")
    public ResponseEntity<ApiResponse<Void>> createCmmnCode(@Valid @RequestBody CmmnCodeDto vo) throws Exception {
        commonCodeService.insertCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 계층 일괄 저장",
            description = "코드 탐색기 편집 결과(코드그룹의 소속 분류코드)를 일괄 반영합니다. 각 항목의 cdId·clsfCd 는 필수입니다.")
    @PutMapping("/cmmn/batch-hierarchy")
    public ResponseEntity<ApiResponse<Void>> updateCmmnCodeHierarchy(
            @Valid @RequestBody List<CmmnCodeHierarchyDto> items) {
        commonCodeService.updateCmmnCodeHierarchy(items);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 수정")
    @PutMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<Void>> updateCmmnCode(@PathVariable String codeId, @Valid @RequestBody CmmnCodeDto vo) throws Exception {
        vo.setCdId(codeId);
        commonCodeService.updateCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 삭제")
    @DeleteMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<Void>> deleteCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCdId(codeId);
        commonCodeService.deleteCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Detail Code (상세코드) ---

    @Operation(summary = "상세코드 목록 조회")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<PageResponse<CmmnDetailCodeDto>>> getDetailCodeList(@ModelAttribute BaseSearchDto searchVO) throws Exception {
        List<CmmnDetailCodeDto> list = commonCodeService.selectCmmnDetailCodeList(searchVO);
        int total = commonCodeService.selectCmmnDetailCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "상세코드 상세 조회")
    @GetMapping("/detail/{codeId}/{code}")
    public ResponseEntity<ApiResponse<CmmnDetailCodeDto>> getDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
        CmmnDetailCodeDto vo = new CmmnDetailCodeDto();
        vo.setCdId(codeId);
        vo.setDtlCd(code);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnDetailCodeDetail(vo)));
    }

    @Operation(summary = "상세코드 등록")
    @PostMapping("/detail")
    public ResponseEntity<ApiResponse<Void>> createDetailCode(@Valid @RequestBody CmmnDetailCodeDto vo) throws Exception {
        commonCodeService.insertCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상세코드 수정")
    @PutMapping("/detail/{codeId}/{code}")
    public ResponseEntity<ApiResponse<Void>> updateDetailCode(@PathVariable String codeId, @PathVariable String code, @Valid @RequestBody CmmnDetailCodeDto vo) throws Exception {
        vo.setCdId(codeId);
        vo.setDtlCd(code);
        commonCodeService.updateCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상세코드 삭제")
    @DeleteMapping("/detail/{codeId}/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
        CmmnDetailCodeDto vo = new CmmnDetailCodeDto();
        vo.setCdId(codeId);
        vo.setDtlCd(code);
        commonCodeService.deleteCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
