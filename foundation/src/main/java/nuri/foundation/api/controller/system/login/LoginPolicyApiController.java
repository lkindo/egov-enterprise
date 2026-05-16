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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 로그인 정책 관리를 위한 REST API 컨트롤러
 */
@Slf4j
@Tag(name = "LoginPolicy", description = "로그인 정책 관리 API (Admin)")
@RestController("systemLoginPolicyApiController")
@RequestMapping("/api/v1/admin/system/login-policies")
@RequiredArgsConstructor
public class LoginPolicyApiController {

    private final LoginPolicyManageService loginPolicyManageService;

    @Operation(summary = "로그인 정책 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LoginPolicyDto>>> getLoginPolicyList(
            @ModelAttribute BaseSearchDto searchDto) throws Exception {

        List<LoginPolicyDto> list = loginPolicyManageService.selectLoginPolicyList(searchDto);
        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "로그인 정책 상세 조회")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<LoginPolicyDto>> getLoginPolicy(
            @PathVariable("userId") String userId) throws Exception {
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy(userId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "로그인 정책 등록")
    @PostMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> insertLoginPolicy(
            @PathVariable("userId") String userId,
            @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setUserId(userId);
        loginPolicyManageService.insertLoginPolicy(loginPolicy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 수정")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateLoginPolicy(
            @PathVariable("userId") String userId,
            @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setUserId(userId);
        loginPolicyManageService.updateLoginPolicy(loginPolicy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 삭제")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteLoginPolicy(
            @PathVariable("userId") String userId) throws Exception {
        LoginPolicyDto dto = LoginPolicyDto.builder().userId(userId).build();
        loginPolicyManageService.deleteLoginPolicy(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
