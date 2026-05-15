package nuri.business.api.controller.report;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.report.EgovWorkReportService;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "WorkReport", description = "주간/월간 보고 API")
@RestController
@RequestMapping("/api/v1/work-reports")
@RequiredArgsConstructor
public class WorkReportApiController {

    private final EgovWorkReportService workReportService;

    @Operation(summary = "업무보고 목록 조회", description = "업무보고 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WorkReportDto>>> getWorkReportList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        String userId = getCurrentUserId();
        Page<WorkReportDto> result = workReportService.getWorkReportList(userId, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "업무보고 상세 조회", description = "업무보고 상세 정보를 조회합니다.")
    @GetMapping("/{rptId}")
    public ResponseEntity<ApiResponse<WorkReportDto>> getWorkReport(
            @Parameter(description = "보고 ID") @PathVariable String rptId) {
        return ResponseEntity.ok(ApiResponse.success(workReportService.getWorkReport(rptId)));
    }

    @Operation(summary = "업무보고 등록", description = "새로운 업무보고를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> registerWorkReport(@RequestBody WorkReportDto dto) {
        String userId = getCurrentUserId();
        dto.setWriterId(userId);
        workReportService.registerWorkReport(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "업무보고 수정", description = "업무보고 정보를 수정합니다.")
    @PutMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> updateWorkReport(
            @PathVariable String rptId,
            @RequestBody WorkReportDto dto) {
        dto.setRptId(rptId);
        workReportService.updateWorkReport(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "업무보고 삭제", description = "업무보고 정보를 삭제합니다.")
    @DeleteMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkReport(@PathVariable String rptId) {
        workReportService.deleteWorkReport(rptId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }
}
