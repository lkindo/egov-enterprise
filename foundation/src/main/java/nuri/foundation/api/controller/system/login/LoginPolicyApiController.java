package nuri.foundation.api.controller.system.login;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.login.LoginPolicyManageService;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 로그인 정책 관리를 위한 API 컨트롤러
 */
@Tag(name = "Login Policy Management", description = "로그인 정책 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/login-policies")
@RequiredArgsConstructor
public class LoginPolicyApiController {

    private final LoginPolicyManageService loginPolicyManageService;
    private final EgovPropertyService propertiesService;

    @Operation(summary = "로그인 정책 목록 조회", description = "시스템 사용자의 로그인 정책 목록을 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginPolicyDto>>> getLoginPolicyList(
            @ModelAttribute BaseSearchDto searchDto) throws Exception {
        
        List<LoginPolicyDto> resultList = loginPolicyManageService.selectLoginPolicyList(searchDto);
        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(resultList, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
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
