package com.company.project.api.controller.system.login;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.login.LoginPolicyManageService;
import com.company.project.service.login.dto.LoginPolicyDto;
import com.company.project.service.login.dto.LoginPolicyVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 로그인 정책 관리를 위한 컨트롤러 (Admin)
 */
@Tag(name = "LoginPolicyAdmin", description = "로그인 정책 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/login-policies")
@RequiredArgsConstructor
public class LoginPolicyAdminController {

    private final LoginPolicyManageService loginPolicyManageService;
    private final EgovPropertyService propertiesService;

    @Operation(summary = "로그인 정책 목록 조회", description = "시스템 사용자의 로그인 정책 목록을 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginPolicyDto>>> getLoginPolicyList(
            @ModelAttribute LoginPolicyVO searchVO) throws Exception {

        try {
            searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
            searchVO.setPageSize(propertiesService.getInt("pageSize"));
        } catch (Exception e) {
            log.warn("Failed to load pageUnit/pageSize from properties, using defaults");
            searchVO.setPageUnit(10);
            searchVO.setPageSize(10);
        }

        searchVO.setFirstIndex((searchVO.getPageIndex() - 1) * searchVO.getPageUnit());
        searchVO.setLastIndex(searchVO.getPageIndex() * searchVO.getPageUnit());
        searchVO.setRecordCountPerPage(searchVO.getPageUnit());

        List<LoginPolicyDto> resultList = loginPolicyManageService.selectLoginPolicyList(searchVO);
        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(resultList, searchVO.getPageIndex(), searchVO.getPageUnit(), totCnt)));
    }

    @Operation(summary = "로그인 정책 상세 조회")
    @GetMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<LoginPolicyDto>> getLoginPolicy(
            @PathVariable("emplyrId") String emplyrId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(loginPolicyManageService.selectLoginPolicy(emplyrId)));
    }

    @Operation(summary = "로그인 정책 저장", description = "신규 등록 또는 기존 정보를 수정합니다.")
    @PutMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<Void>> saveLoginPolicy(
            @PathVariable("emplyrId") String emplyrId,
            @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setEmplyrId(emplyrId);

        LoginPolicyDto existing = loginPolicyManageService.selectLoginPolicy(emplyrId);
        if (existing != null && "Y".equals(existing.getRegYn())) {
            loginPolicyManageService.updateLoginPolicy(loginPolicy);
        } else {
            loginPolicyManageService.insertLoginPolicy(loginPolicy);
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 삭제")
    @DeleteMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<Void>> deleteLoginPolicy(
            @PathVariable("emplyrId") String emplyrId) throws Exception {
        loginPolicyManageService.deleteLoginPolicy(emplyrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
