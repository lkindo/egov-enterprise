package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.auth.DeptAuthorProjection;
import com.company.project.service.auth.UserAuthorityService;
import com.company.project.service.auth.dto.DeptAuthorBatchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/security/dept-authorities")
@RequiredArgsConstructor
@Tag(name = "Department Authority (Admin)", description = "부서별 권한 관리 API (관리자용)")
public class DeptAuthorityController {

    private final UserAuthorityService userAuthorityService;

    @Operation(summary = "부서별 권한 목록 조회", description = "특정 부서의 사용자별 권한 할당 현황을 조회합니다.")
    @GetMapping("/{deptId}")
    public ResponseEntity<ApiResponse<List<DeptAuthorProjection>>> getDeptAuthors(
            @PathVariable String deptId,
            @PageableDefault(size = 100) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(userAuthorityService.selectDeptAuthorList(deptId, pageable)));
    }

    @Operation(summary = "부서별 권한 일괄 설정", description = "부서 전체 또는 특정 사용자들에게 권한을 일괄 부여합니다.")
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<Void>> batchUpdateDeptAuthor(
            @RequestBody DeptAuthorBatchDto batchDto) {
        log.debug("Batch update dept author: {}", batchDto);
        userAuthorityService.processDeptAuthorBatch(batchDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
