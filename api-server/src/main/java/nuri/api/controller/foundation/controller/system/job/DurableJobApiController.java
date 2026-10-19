package nuri.api.controller.foundation.controller.system.job;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigInteger;
import lombok.RequiredArgsConstructor;
import nuri.business.service.system.job.DurableJobAdministrationService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.api.support.UnsortedPageable;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Durable Work", description = "후속 작업 전달 상태와 명시적 재처리")
@RestController
@RequestMapping("/api/v1/admin/system/durable-jobs")
@RequiredArgsConstructor
public class DurableJobApiController {
    private final DurableJobAdministrationService service;

    @Operation(operationId = "durableJobList", summary = "후속 작업 상태 조회")
    @GetMapping("")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.job.DurableJobApiController#getJobs')")
    public ResponseEntity<ApiResponse<PageResponse<DurableJobAdministrationService.Status>>> getJobs(
            @PageableDefault(size = 20) @UnsortedPageable Pageable page) {
        // [ADR-0036] 다른 목록과 같은 PageResponse 다 — 종전에는 Spring Page 원형(content·number·0 기반)을 그대로 내보냈다.
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                service.getJobs(page.getPageNumber(), page.getPageSize()))));
    }

    @Operation(operationId = "durableJobRetry", summary = "재시도 한도에 도달한 작업 재처리")
    @nuri.foundation.core.annotation.SensitiveOperation("내구 작업 재시도")
    @PostMapping("/{jobSn}/retry")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.job.DurableJobApiController#retry')")
    public ResponseEntity<ApiResponse<Void>> retry(@PathVariable String jobSn) {
        if (!jobSn.matches("[1-9][0-9]{0,21}")) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        service.retry(new BigInteger(jobSn));
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
