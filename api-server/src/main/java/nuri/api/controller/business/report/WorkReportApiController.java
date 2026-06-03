package nuri.api.controller.business.report;

import nuri.business.service.report.EgovWorkReportService;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "WorkReport", description = "작업보고 관리 API")
@RestController
@RequestMapping("/api/v1/work-reports")
@RequiredArgsConstructor
public class WorkReportApiController {

    private final EgovWorkReportService workReportService;

    @Operation(summary = "작업보고 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WorkReportDto>>> getWorkReportList(
            @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());
        Page<WorkReportDto> page = workReportService.getWorkReportList(
                searchDto.getSearchKeyword(), null, searchDto.getSearchKeyword(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "작업보고 상세 조회")
    @GetMapping("/{rptId}")
    public ResponseEntity<ApiResponse<WorkReportDto>> getWorkReport(@PathVariable String rptId) {
        WorkReportDto result = workReportService.getWorkReport(rptId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "작업보고 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createWorkReport(@RequestBody WorkReportDto dto) {
        workReportService.createWorkReport(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "작업보고 수정")
    @PutMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> updateWorkReport(@PathVariable String rptId, @RequestBody WorkReportDto dto) {
        dto.setRptId(rptId);
        workReportService.updateWorkReport(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "작업보고 삭제")
    @DeleteMapping("/{rptId}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkReport(@PathVariable String rptId) {
        workReportService.deleteWorkReport(rptId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
