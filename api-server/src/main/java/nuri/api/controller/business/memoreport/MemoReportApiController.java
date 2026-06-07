package nuri.api.controller.business.memoreport;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.memoreport.EgovMemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
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

@Tag(name = "MemoReport", description = "메모보고 관리 API")
@RestController
@RequestMapping("/api/v1/memo-reports")
@RequiredArgsConstructor
public class MemoReportApiController {

    private final EgovMemoReportService memoReportService;

    @Operation(summary = "메모보고 목록 조회", description = "전체 메모보고 목록을 페이징하여 조회합니다.")
    @GetMapping
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
    @GetMapping("/{rptId}")
    public ResponseEntity<ApiResponse<MemoReportDto>> getMemoReport(
            @Parameter(description = "보고 ID") @PathVariable String rptId) {
        memoReportService.readMemoReport(rptId);
        return ResponseEntity.ok(ApiResponse.success(memoReportService.getMemoReport(rptId)));
    }

    @Operation(summary = "메모보고 등록", description = "새로운 메모보고를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MemoReportDto dto) {
        String rptId = memoReportService.createMemoReport(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(rptId));
    }

    @Operation(summary = "메모보고 수정", description = "기존 메모보고를 수정합니다.")
    @PutMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> updateMemoReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String rptId,
            @Valid @RequestBody MemoReportDto dto) {
        memoReportService.updateMemoReport(rptId, userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지시사항 업데이트", description = "메모보고에 대한 지시사항을 업데이트합니다.")
    @PatchMapping("/{rptId}/instr-cn")
    public ResponseEntity<ApiResponse<Void>> updateDrctMatter(
            @PathVariable String rptId,
            @RequestBody String instrCn) {
        memoReportService.updateDrctMatter(rptId, instrCn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메모보고 삭제", description = "메모보고 정보를 삭제합니다.")
    @DeleteMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> deleteMemoReport(@PathVariable String rptId) {
        memoReportService.deleteMemoReport(rptId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
