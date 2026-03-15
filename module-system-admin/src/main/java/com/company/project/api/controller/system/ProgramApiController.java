package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.program.ProgramService;
import com.company.project.service.program.dto.ProgramDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 프로그램 관리를 위한 REST 컨트롤러 (Admin)
 */
@Tag(name = "ProgramAdmin", description = "시스템 프로그램 관리 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/system/programs")
@RequiredArgsConstructor
public class ProgramApiController {

    private final ProgramService programService;

    @Operation(summary = "프로그램 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProgramDto>>> getProgramList(
            @RequestParam(required = false) String searchWrd,
            Pageable pageable) throws Exception {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword(searchWrd);
        searchVO.setFirstIndex((int) pageable.getOffset());
        searchVO.setRecordCountPerPage(pageable.getPageSize());

        List<ProgramDto> list = programService.selectProgrmList(searchVO);
        int total = programService.selectProgrmListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageable.getPageNumber() + 1, pageable.getPageSize(), total)));
    }

    @Operation(summary = "프로그램 상세 조회")
    @GetMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<ProgramDto>> getProgram(@PathVariable String progrmFileNm) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(programService.selectProgrmById(progrmFileNm)));
    }

    @Operation(summary = "프로그램 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createProgram(@RequestBody ProgramDto dto) throws Exception {
        programService.insertProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "프로그램 정보 수정")
    @PutMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<Void>> updateProgram(@PathVariable String progrmFileNm,
            @RequestBody ProgramDto dto) throws Exception {
        dto.setProgrmFileNm(progrmFileNm);
        programService.updateProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "프로그램 삭제")
    @DeleteMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<Void>> deleteProgram(@PathVariable String progrmFileNm) throws Exception {
        ProgramDto dto = new ProgramDto();
        dto.setProgrmFileNm(progrmFileNm);
        programService.deleteProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
