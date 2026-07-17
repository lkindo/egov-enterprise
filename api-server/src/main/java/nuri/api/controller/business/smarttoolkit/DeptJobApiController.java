package nuri.api.controller.business.smarttoolkit;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.deptjob.EgovDeptJobBoxService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 부서 업무함 관리 API 컨트롤러
 */
@Tag(name = "DeptJob", description = "부서 업무함 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/dept-jobs")
@RequiredArgsConstructor
public class DeptJobApiController {

    private final EgovDeptJobBoxService egovDeptJobBoxService;

    @Operation(summary = "부서 업무함 목록 조회", description = "부서 업무함 목록을 페이징하여 조회합니다.")
    @GetMapping("/boxes")
    public ResponseEntity<ApiResponse<PageResponse<DeptJobBoxDto>>> getDeptJobBoxList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "") String deptId,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<DeptJobBoxDto> pageResult;

        if (deptId != null && !deptId.isEmpty()) {
            pageResult = egovDeptJobBoxService.getDeptJobBoxListByDept(deptId, pageable);
        } else {
            pageResult = egovDeptJobBoxService.getDeptJobBoxList(searchWrd, pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "부서 업무함 상세 조회", description = "특정 부서 업무함의 상세 정보를 조회합니다.")
    @GetMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<DeptJobBoxDto>> getDeptJobBox(@PathVariable String deptJobbxId) {
        DeptJobBoxDto dto = egovDeptJobBoxService.getDeptJobBox(deptJobbxId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "부서 업무함 등록", description = "새로운 부서 업무함을 등록합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @PostMapping("/boxes")
    public ResponseEntity<ApiResponse<String>> createDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody DeptJobBoxDto dto) {
        String userId = userDetails.getEsntlId();
        String newId = egovDeptJobBoxService.createDeptJobBox(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "부서 업무함 수정", description = "기존 부서 업무함 정보를 수정합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @PutMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<Void>> updateDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String deptJobbxId,
            @Valid @RequestBody DeptJobBoxDto dto) {
        String userId = userDetails.getEsntlId();
        egovDeptJobBoxService.updateDeptJobBox(deptJobbxId, userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 업무함 삭제", description = "부서 업무함을 삭제합니다.")
    @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
    @DeleteMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<Void>> deleteDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String deptJobbxId) {
        egovDeptJobBoxService.deleteDeptJobBox(deptJobbxId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
