package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import com.company.project.core.response.ApiResponse;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Code", description = "공통코드 관리 API")
@RestController
@RequestMapping("/api/v1/admin/codes")
@RequiredArgsConstructor
public class CodeApiController {

    private final CommonCodeService commonCodeService;
    private final EgovPropertyService propertiesService;

    // --- Classification Code (분류코드) ---

    @Operation(summary = "분류코드 목록 조회")
    @GetMapping("/cl")
    public ResponseEntity<?> getClCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnClCodeDto> list = commonCodeService.selectCmmnClCodeList(searchVO);
        int total = commonCodeService.selectCmmnClCodeListTotCnt(searchVO);
        return ResponseEntity.ok(createPageResult(list, total, searchVO));
    }

    @Operation(summary = "분류코드 상세 조회")
    @GetMapping("/cl/{clCode}")
    public ResponseEntity<?> getClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClCode(clCode);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnClCodeDetail(vo)));
    }

    @Operation(summary = "분류코드 등록")
    @PostMapping("/cl")
    public ResponseEntity<?> createClCode(@Valid @RequestBody CmmnClCodeDto vo) throws Exception {
        commonCodeService.insertCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "분류코드 수정")
    @PutMapping("/cl/{clCode}")
    public ResponseEntity<?> updateClCode(@PathVariable String clCode, @Valid @RequestBody CmmnClCodeDto vo) throws Exception {
        vo.setClCode(clCode);
        commonCodeService.updateCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "분류코드 삭제")
    @DeleteMapping("/cl/{clCode}")
    public ResponseEntity<?> deleteClCode(@PathVariable String clCode) throws Exception {
        CmmnClCodeDto vo = new CmmnClCodeDto();
        vo.setClCode(clCode);
        commonCodeService.deleteCmmnClCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Common Code (공통코드) ---

    @Operation(summary = "공통코드 목록 조회")
    @GetMapping("/cmmn")
    public ResponseEntity<?> getCmmnCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnCodeDto> list = commonCodeService.selectCmmnCodeList(searchVO);
        int total = commonCodeService.selectCmmnCodeListTotCnt(searchVO);
        return ResponseEntity.ok(createPageResult(list, total, searchVO));
    }

    @Operation(summary = "공통코드 상세 조회")
    @GetMapping("/cmmn/{codeId}")
    public ResponseEntity<?> getCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCodeId(codeId);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnCodeDetail(vo)));
    }

    @Operation(summary = "공통코드 등록")
    @PostMapping("/cmmn")
    public ResponseEntity<?> createCmmnCode(@Valid @RequestBody CmmnCodeDto vo) throws Exception {
        commonCodeService.insertCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 수정")
    @PutMapping("/cmmn/{codeId}")
    public ResponseEntity<?> updateCmmnCode(@PathVariable String codeId, @Valid @RequestBody CmmnCodeDto vo) throws Exception {
        vo.setCodeId(codeId);
        commonCodeService.updateCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공통코드 삭제")
    @DeleteMapping("/cmmn/{codeId}")
    public ResponseEntity<?> deleteCmmnCode(@PathVariable String codeId) throws Exception {
        CmmnCodeDto vo = new CmmnCodeDto();
        vo.setCodeId(codeId);
        commonCodeService.deleteCmmnCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Detail Code (상세코드) ---

    @Operation(summary = "상세코드 목록 조회")
    @GetMapping("/detail")
    public ResponseEntity<?> getDetailCodeList(@ModelAttribute ComDefaultVO searchVO) throws Exception {
        setupPagination(searchVO);
        List<CmmnDetailCodeDto> list = commonCodeService.selectCmmnDetailCodeList(searchVO);
        int total = commonCodeService.selectCmmnDetailCodeListTotCnt(searchVO);
        return ResponseEntity.ok(createPageResult(list, total, searchVO));
    }

    @Operation(summary = "상세코드 상세 조회")
    @GetMapping("/detail/{codeId}/{code}")
    public ResponseEntity<?> getDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
        CmmnDetailCodeDto vo = new CmmnDetailCodeDto();
        vo.setCodeId(codeId);
        vo.setCode(code);
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.selectCmmnDetailCodeDetail(vo)));
    }

    @Operation(summary = "상세코드 등록")
    @PostMapping("/detail")
    public ResponseEntity<?> createDetailCode(@Valid @RequestBody CmmnDetailCodeDto vo) throws Exception {
        commonCodeService.insertCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상세코드 수정")
    @PutMapping("/detail/{codeId}/{code}")
    public ResponseEntity<?> updateDetailCode(@PathVariable String codeId, @PathVariable String code, @Valid @RequestBody CmmnDetailCodeDto vo) throws Exception {
        vo.setCodeId(codeId);
        vo.setCode(code);
        commonCodeService.updateCmmnDetailCode(vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "상세코드 삭제")
    @DeleteMapping("/detail/{codeId}/{code}")
    public ResponseEntity<?> deleteDetailCode(@PathVariable String codeId, @PathVariable String code) throws Exception {
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
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());
        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
    }

    private Map<String, Object> createPageResult(List<?> list, int total, ComDefaultVO searchVO) {
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());
        paginationInfo.setTotalRecordCount(total);

        Map<String, Object> result = new HashMap<>();
        result.put("list", list);
        result.put("paginationInfo", paginationInfo);
        return result;
    }
}
