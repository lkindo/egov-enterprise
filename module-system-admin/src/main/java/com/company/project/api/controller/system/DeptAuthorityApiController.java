package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.domain.auth.DeptAuthorProjection;
import com.company.project.service.auth.UserAuthorityManageService;
import com.company.project.service.auth.dto.UserAuthorityDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 부서별 권한 매핑 관리 API 컨트롤러
 */
@Tag(name = "Department-Authority Mapping", description = "시스템 부서별 권한 할당 관리 API (Admin)")
@Slf4j
@RestController("systemDeptAuthorityApiController")
@RequestMapping("/api/v1/admin/system/depts/{deptCode}/authorities")
@RequiredArgsConstructor
public class DeptAuthorityApiController {

    private final UserAuthorityManageService userAuthorityManageService;

    @Operation(summary = "부서별 권한 목록 조회", description = "특정 부서 내 사용자들의 권한 할당 상태를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DeptAuthorProjection>>> getDeptAuthorities(
            @PathVariable String deptCode,
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex) {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(pageIndex);
        searchVO.setPageUnit(10);

        Page<DeptAuthorProjection> result = userAuthorityManageService.selectDeptAuthorityList(deptCode, searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(),
                result.getNumber() + 1,
                result.getSize(),
                (int) result.getTotalElements()
        )));
    }

    @Operation(summary = "부서 사용자 권한 일괄 저장", description = "해당 부서 사용자들에 대해 권한을 일괄 할당하거나 업데이트합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveDeptUserAuthorities(
            @RequestBody List<UserAuthorityDto> userAuthorities) {

        userAuthorityManageService.saveUserAuthorities(userAuthorities);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
