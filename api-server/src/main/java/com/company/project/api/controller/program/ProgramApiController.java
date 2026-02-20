package com.company.project.api.controller.program;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.program.ProgramService;

import com.company.project.service.program.dto.ProgramDto;

import egovframework.com.cmm.ComDefaultVO;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Program Admin", description = "System Program Management APIs")

@RestController

@RequestMapping("/api/v1/admin/programs")

@RequiredArgsConstructor

public class ProgramApiController {

    private final ProgramService programService;

@Operation(summary = "Get Program List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<ProgramDto>>> getProgramList(

            @RequestParam(required = false) String searchWrd,

            Pageable pageable) throws Exception {

        ComDefaultVO searchVO = new ComDefaultVO();

        searchVO.setSearchKeyword(searchWrd);

        searchVO.setFirstIndex((int) pageable.getOffset());

        searchVO.setRecordCountPerPage(pageable.getPageSize());

        List<ProgramDto> list = programService.selectProgrmList(searchVO);

        int total = programService.selectProgrmListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(

                new org.springframework.data.domain.PageImpl<>(list, pageable, total)));

    }

@Operation(summary = "Get Program Detail")

    @GetMapping("/{progrmFileNm}")

    public ResponseEntity<ApiResponse<ProgramDto>> getProgram(@PathVariable String progrmFileNm) throws Exception {

        return ResponseEntity.ok(ApiResponse.success(programService.selectProgrmById(progrmFileNm)));

    }

@Operation(summary = "Create Program")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createProgram(@RequestBody ProgramDto dto) throws Exception {

        programService.insertProgrm(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Update Program")

    @PutMapping("/{progrmFileNm}")

    public ResponseEntity<ApiResponse<Void>> updateProgram(@PathVariable String progrmFileNm,

            @RequestBody ProgramDto dto) throws Exception {

        dto.setProgrmFileNm(progrmFileNm);

        programService.updateProgrm(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Program")

    @DeleteMapping("/{progrmFileNm}")

    public ResponseEntity<ApiResponse<Void>> deleteProgram(@PathVariable String progrmFileNm) throws Exception {

        ProgramDto dto = new ProgramDto();

        dto.setProgrmFileNm(progrmFileNm);

        programService.deleteProgrm(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

