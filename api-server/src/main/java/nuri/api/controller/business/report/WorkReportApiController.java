package nuri.api.controller.business.report;

import jakarta.validation.Valid;
import nuri.business.service.report.WorkReportService;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
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

    private final WorkReportService workReportService;

    @Operation(summary = "작업보고 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WorkReportDto>>> getWorkReportList(
            @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());

        // ⚠ 종전에는 searchKeyword 를 첫 인자(searchId)에도 함께 넘겼다. searchId 는
        //   WorkReportRepositoryImpl 에서 userId.eq(...) 즉 **작성자 완전일치**로 쓰이므로,
        //   제목으로 검색하면 "작성자 == 검색어" 조건이 함께 걸려 항상 0건이 나왔다.
        //   제목 검색(rptTtl.contains)만 하도록 작성자 필터는 비워 둔다.
        //   (작성자로 좁히는 기능이 필요해지면 별도 파라미터로 받아야 한다.)
        Page<WorkReportDto> page = workReportService.getWorkReportList(
                null, null, searchDto.getSearchKeyword(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "작업보고 상세 조회")
    @GetMapping("/{rptpSn}")
    public ResponseEntity<ApiResponse<WorkReportDto>> getWorkReport(@PathVariable Long rptpSn) {
        WorkReportDto result = workReportService.getWorkReport(rptpSn);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "작업보고 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createWorkReport(@Valid @RequestBody WorkReportDto dto) {
        // 작성자는 서버가 인증 주체(loginId)로 고정한다 — 요청 본문의 userId 는 신뢰하지 않는다.
        workReportService.createWorkReport(
                nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("anonymous"), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "작업보고 수정")
    @PutMapping("/{rptpSn}")
    public ResponseEntity<ApiResponse<Void>> updateWorkReport(@PathVariable Long rptpSn, @Valid @RequestBody WorkReportDto dto) {
        dto.setRptpSn(rptpSn);
        workReportService.updateWorkReport(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "작업보고 삭제")
    @DeleteMapping("/{rptpSn}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkReport(@PathVariable Long rptpSn) {
        workReportService.deleteWorkReport(rptpSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
