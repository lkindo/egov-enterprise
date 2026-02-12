package com.company.project.api.controller.mrm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.memoreport.EgovMemoReportService;
import com.company.project.service.memoreport.dto.MemoReportDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "MemoReport", description = "Memo Report Management APIs")
@RestController
@RequestMapping("/api/v1/memo-reports")
@RequiredArgsConstructor
public class MemoReportController {

    private final EgovMemoReportService memoReportService;

    @Operation(summary = "메모보고 목록 조회", description = "메모보고 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getMemoReports(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReportList(searchKeyword, pageable)));
    }

    @Operation(summary = "내가 작성한 보고 목록 조회", description = "내가 작성한 메모보고 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getMyReports(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMyReportList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "받은 보고 목록 조회", description = "나에게 보고된 메모보고 목록을 조회합니다.")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<Page<MemoReportDto>>> getReceivedReports(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getReceivedReportList(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "메모보고 상세 조회", description = "메모보고의 상세 내용을 조회합니다.")
    @GetMapping("/{reprtId}")
    public ResponseEntity<ApiResponse<MemoReportDto>> getMemoReport(
            @Parameter(description = "보고 ID") @PathVariable String reprtId) {
        // 확인 일시 업데이트 (수신자인 경우)
        memoReportService.readMemoReport(reprtId);
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReport(reprtId)));
    }

    @Operation(summary = "메모보고 등록", description = "새로운 메모보고를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MemoReportDto dto) {
        String reprtId = memoReportService.createMemoReport(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(reprtId));
    }

    @Operation(summary = "메모보고 수정", description = "작성자가 메모보고 내용을 수정합니다.")
    @PutMapping("/{reprtId}")
    public ResponseEntity<ApiResponse<Void>> updateMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String reprtId,
            @RequestBody MemoReportDto dto) {
        memoReportService.updateMemoReport(reprtId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지시사항 등록", description = "보고대상자가 보고 내용에 대해 지시사항을 등록합니다.")
    @PatchMapping("/{reprtId}/drct-matter")
    public ResponseEntity<ApiResponse<Void>> updateDrctMatter(
            @PathVariable String reprtId,
            @RequestBody String drctMatter) {
        memoReportService.updateDrctMatter(reprtId, drctMatter);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메모보고 삭제", description = "메모보고를 삭제합니다.")
    @DeleteMapping("/{reprtId}")
    public ResponseEntity<ApiResponse<Void>> deleteMemoReport(
            @PathVariable String reprtId) {
        memoReportService.deleteMemoReport(reprtId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
