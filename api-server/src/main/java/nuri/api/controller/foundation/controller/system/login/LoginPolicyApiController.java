package nuri.api.controller.foundation.controller.system.login;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.login.LoginPolicyManageService;
import nuri.business.service.login.dto.LoginPolicyDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 로그인 정책 관리를 위한 REST API 컨트롤러.
 *
 * <p>[2026-08-27 인가 보강] 이 컨트롤러는 5개 엔드포인트 어디에도 메서드 인가가 없었고
 * URL 게이트({@code secure-paths} 의 {@code /api/v1/admin/**} → {@code ADMIN_ALL}) <b>한 겹</b>에만
 * 의존했다. 그 매핑 한 줄이 빠지면 접속 IP 제한·허용 시간대·2단계 인증(OTP) 설정이 함께 열린다.
 *
 * <p>지금은 핸들러마다 operation binding 이 있다 — 조회 {@code LOGIN_POL_READ}, 등록·수정·삭제
 * {@code LOGIN_POL_CREATE}·{@code LOGIN_POL_UPDATE}·{@code LOGIN_POL_DELETE}(기본 그룹 ROLE_ADMIN·ROLE_SYSTEM).
 * HTTP 계층({@code OperationAuthorizationManager})과 메서드 계층
 * ({@code @PreAuthorize("@permissionPolicy.allowed(...)")})이 같은 binding 을 이중 집행하고,
 * 보호 계정 대상 쓰기는 서비스가 한 번 더 막는다(DEC-OPS-213).
 *
 * <p>개인정보 증적처럼 열람 자체가 통제 대상인 자원이 아니므로 {@code ROLE_SYSTEM} 강제 제외
 * ({@code excludedGroups})는 두지 않는다 — 인가 의미를 넓히지도 좁히지도 않는다(H3).
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
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController#getLoginPolicyList')")
    public ResponseEntity<ApiResponse<PageResponse<LoginPolicyDto>>> getLoginPolicyList(
            @Valid @ModelAttribute BaseSearchDto searchDto) throws Exception {

        List<LoginPolicyDto> list = loginPolicyManageService.selectLoginPolicyList(searchDto);
        int totCnt = loginPolicyManageService.selectLoginPolicyListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }

    @Operation(summary = "로그인 정책 상세 조회")
    @GetMapping("/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController#getLoginPolicy')")
    public ResponseEntity<ApiResponse<LoginPolicyDto>> getLoginPolicy(
            @PathVariable("userId") String userId) throws Exception {
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy(userId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "로그인 정책 등록")
    @PostMapping("/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController#insertLoginPolicy')")
    public ResponseEntity<ApiResponse<Void>> insertLoginPolicy(
            @PathVariable("userId") String userId,
            @Valid @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setUserId(userId);
        loginPolicyManageService.insertLoginPolicy(loginPolicy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 수정")
    @PutMapping("/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController#updateLoginPolicy')")
    public ResponseEntity<ApiResponse<Void>> updateLoginPolicy(
            @PathVariable("userId") String userId,
            @Valid @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setUserId(userId);
        loginPolicyManageService.updateLoginPolicy(loginPolicy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 삭제")
    @DeleteMapping("/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController#deleteLoginPolicy')")
    public ResponseEntity<ApiResponse<Void>> deleteLoginPolicy(
            @PathVariable("userId") String userId) throws Exception {
        LoginPolicyDto dto = LoginPolicyDto.builder().userId(userId).build();
        loginPolicyManageService.deleteLoginPolicy(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
