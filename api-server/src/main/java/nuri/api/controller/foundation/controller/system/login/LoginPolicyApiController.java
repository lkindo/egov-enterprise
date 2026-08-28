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
 * 저장소의 다른 관리 API 가 이미 쓰는 규칙대로 메서드 인가를 클래스에 직접 붙여 방어선을 이중화한다.
 *
 * <p><b>동작은 바뀌지 않는다.</b> {@code ADMIN_ALL} 은 운영 시드(V2_11)에서 ROLE_ADMIN·ROLE_SYSTEM
 * 두 롤에 매핑돼 있고 {@code @AdminOrSystem} 이 정확히 같은 집합이다. 즉 지금 접근할 수 있는 사람이
 * 계속 접근하고, URL 게이트가 사라졌을 때만 차이가 난다.
 *
 * <p>개인정보 증적처럼 열람 자체가 통제 대상인 자원이 아니므로
 * {@code @PrivacyAdminOnly}(SYSTEM 배제)는 쓰지 않는다 — 인가 의미를 넓히지도 좁히지도 않는다(H3).
 */
@Slf4j
@Tag(name = "LoginPolicy", description = "로그인 정책 관리 API (Admin)")
@RestController("systemLoginPolicyApiController")
@RequestMapping("/api/v1/admin/system/login-policies")
@RequiredArgsConstructor
@nuri.foundation.security.annotation.AdminOrSystem
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
            @Valid @RequestBody LoginPolicyDto loginPolicy) throws Exception {
        loginPolicy.setUserId(userId);
        loginPolicyManageService.insertLoginPolicy(loginPolicy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "로그인 정책 수정")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateLoginPolicy(
            @PathVariable("userId") String userId,
            @Valid @RequestBody LoginPolicyDto loginPolicy) throws Exception {
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
