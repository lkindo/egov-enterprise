package nuri.foundation.api.controller.code;

import nuri.foundation.service.code.CommonCodeService;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
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
    private final EgovPropertyService propertiesService;

    // --- Classification Code (분류코드) ---

    @Operation(summary = "분류코드 목록 조회")
    @GetMapping("/cl")
    public ResponseEntity<ApiResponse<PageResponse<CmmnClCodeDto>>> getClCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnClCodeDto> list = commonCodeService.selectCmmnClCodeList(searchVO);
        int total = commonCodeService.selectCmmnClCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "분류코드 상세 조회")
    @GetMapping("/cl/{clCode}")
    public ResponseEntity<ApiResponse<CmmnClCodeDto>> getClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClCode(clCode);
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
        vo.setClCode(clCode);
        commonCodeService.updateCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "분류코드 삭제")
    @DeleteMapping("/cl/{clCode}")
    public ResponseEntity<ApiResponse<Void>> deleteClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClCode(clCode);
        commonCodeService.deleteCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Common Code (공통코드) ---

    @Operation(summary = "공통코드 목록 조회")
    @GetMapping("/cmmn")
    public ResponseEntity<ApiResponse<PageResponse<CmmnCodeDto>>> getCmmnCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnCodeDto> list = commonCodeService.selectCmmnCodeList(searchVO);
        int total = commonCodeService.selectCmmnCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "공통코드 상세 조회")
    @GetMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<CmmnCodeDto>> getCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCodeId(codeId);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnCodeDetail(vo)));
    }

    @Operation(summary = "공통코드 등록")
    @PostMapping("/cmmn")
    public ResponseEntity<ApiResponse<Void>> createCmmnCode(@Valid @RequestBody CmmnCodeDto vo) throws Exception {
        commonCodeService.insertCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 수정")
    @PutMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<Void>> updateCmmnCode(@PathVariable String codeId, @Valid @RequestBody CmmnCodeDto vo) throws Exception {
        vo.setCodeId(codeId);
        commonCodeService.updateCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 삭제")
    @DeleteMapping("/cmmn/{codeId}")
    public ResponseEntity<ApiResponse<Void>> deleteCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCodeId(codeId);
        commonCodeService.deleteCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Detail Code (상세코드) ---

    @Operation(summary = "상세코드 목록 조회")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<PageResponse<CmmnDetailCodeDto>>> getDetailCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnDetailCodeDto> list = commonCodeService.selectCmmnDetailCodeList(searchVO);
        int total = commonCodeService.selectCmmnDetailCodeListTotCnt(searchVO);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchVO.getPageIndex(), searchVO.getPageUnit(), total)));
    }

    @Operation(summary = "상세코드 상세 조회")
    @GetMapping("/detail/{codeId}/{code}")
    public ResponseEntity<ApiResponse<CmmnDetailCodeDto>> getDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
        CmmnDetailCodeDto vo = new CmmnDetailCodeDto();
        vo.setCodeId(codeId);
        vo.setCode(code);
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
        vo.setCodeId(codeId);
        vo.setCode(code);
        commonCodeService.updateCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상세코드 삭제")
    @DeleteMapping("/detail/{codeId}/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
        CmmnDetailCodeDto vo = new CmmnDetailCodeDto();
        vo.setCodeId(codeId);
        vo.setCode(code);
        commonCodeService.deleteCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Helper Methods ---

    private void setupPagination(ComDefaultVO searchVO) {
        if (searchVO.getPageUnit() <= 0) {
            searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        }
        if (searchVO.getPageSize() <= 0) {
            searchVO.setPageSize(propertiesService.getInt("pageSize"));
        }
        searchVO.setFirstIndex((searchVO.getPageIndex() - 1) * searchVO.getPageUnit());
        searchVO.setLastIndex(searchVO.getPageIndex() * searchVO.getPageUnit());
        searchVO.setRecordCountPerPage(searchVO.getPageUnit());
    }
}
