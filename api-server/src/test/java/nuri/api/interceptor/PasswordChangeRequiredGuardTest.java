package nuri.api.interceptor;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 임시 비밀번호 사용자의 API 차단 범위(2026-10-01 결정 18). */
class PasswordChangeRequiredGuardTest {

    private final PasswordChangeRequiredGuard guard = new PasswordChangeRequiredGuard();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signIn(boolean passwordChangeRequired) {
        CustomUserDetails principal = CustomUserDetails.builder().userId("user1").esntlId("USR_1").userNm("대상")
                .enabled(true).passwordChangeRequired(passwordChangeRequired).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "", List.of()));
    }

    private boolean pass(String method, String uri) {
        return guard.preHandle(new MockHttpServletRequest(method, uri), new MockHttpServletResponse(), new Object());
    }

    @Test
    @DisplayName("임시 비밀번호 사용자는 업무 API 를 A009 로 거부당한다")
    void rejectsOtherApisWhileChangeIsRequired() {
        signIn(true);
        assertThatThrownBy(() -> pass("GET", "/api/v1/menus"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.PASSWORD_CHANGE_REQUIRED);
        assertThatThrownBy(() -> pass("PUT", "/api/v1/users/me")).as("프로필 수정도 막는다")
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> pass("GET", "/api/v1/users/me/password")).as("허용은 메서드까지 맞아야 한다")
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("인증 경로·본인 조회·본인 비밀번호 변경은 통과한다")
    void allowsTheWayOut() {
        signIn(true);
        assertThat(pass("GET", "/api/v1/auth/me")).isTrue();
        assertThat(pass("POST", "/api/v1/auth/logout")).isTrue();
        assertThat(pass("GET", "/api/v1/users/me")).isTrue();
        assertThat(pass("PUT", "/api/v1/users/me/password")).isTrue();
    }

    @Test
    @DisplayName("변경 의무가 없는 사용자와 익명 요청은 건드리지 않는다")
    void leavesOthersAlone() {
        signIn(false);
        assertThat(pass("GET", "/api/v1/menus")).isTrue();
        SecurityContextHolder.clearContext();
        assertThat(pass("GET", "/api/v1/menus")).isTrue();
    }
}
