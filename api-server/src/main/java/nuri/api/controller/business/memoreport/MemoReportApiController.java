package nuri.api.controller.business.memoreport;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.memoreport.MemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "MemoReport", description = "메모보고 관리 API")
@nuri.foundation.security.annotation.Authenticated
@RestController
@RequestMapping("/api/v1/memo-reports")
@RequiredArgsConstructor
public class MemoReportApiController {

    private final MemoReportService memoReportService;

    @Operation(summary = "메모보고 목록 조회", description = "전체 메모보고 목록을 페이징하여 조회합니다. (관리자 전용)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<MemoReportDto>>> getMemoReports(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<MemoReportDto> result = memoReportService.getMemoReportList(searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "나의 메모보고 목록 조회", description = "내가 작성한 메모보고 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<MemoReportDto>>> getMyReports(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<MemoReportDto> result = memoReportService.getMyReportList(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "수신 메모보고 목록 조회", description = "나에게 수신된 메모보고 목록을 조회합니다.")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<PageResponse<MemoReportDto>>> getReceivedReports(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<MemoReportDto> result = memoReportService.getReceivedReportList(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "메모보고 상세 조회", description = "메모보고 상세 정보를 조회합니다.")
    @GetMapping("/{memoRptSn}")
    public ResponseEntity<ApiResponse<MemoReportDto>> getMemoReport(
            @Parameter(description = "메모보고 일련번호") @PathVariable Long memoRptSn) {
        memoReportService.readMemoReport(memoRptSn);
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReport(memoRptSn)));
    }

    @Operation(summary = "메모보고 등록", description = "새로운 메모보고를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MemoReportDto dto) {
        Long memoRptSn = memoReportService.createMemoReport(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(memoRptSn));
    }

    @Operation(summary = "메모보고 수정", description = "기존 메모보고를 수정합니다.")
    @PutMapping("/{memoRptSn}")
    public ResponseEntity<ApiResponse<Void>> updateMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long memoRptSn,
            @Valid @RequestBody MemoReportDto dto) {
        memoReportService.updateMemoReport(memoRptSn, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지시사항 업데이트", description = "메모보고에 대한 지시사항을 업데이트합니다.")
    @PatchMapping("/{memoRptSn}/instr-cn")
    public ResponseEntity<ApiResponse<Void>> updateDrctMatter(
            @PathVariable Long memoRptSn,
            @RequestBody String instrCn) {
        memoReportService.updateDrctMatter(memoRptSn, instrCn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메모보고 삭제", description = "메모보고 정보를 삭제합니다.")
    @DeleteMapping("/{memoRptSn}")
    public ResponseEntity<ApiResponse<Void>> deleteMemoReport(@PathVariable Long memoRptSn) {
        memoReportService.deleteMemoReport(memoRptSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
