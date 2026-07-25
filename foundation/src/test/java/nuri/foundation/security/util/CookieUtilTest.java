package nuri.foundation.security.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class CookieUtilTest {

    @Test
    @DisplayName("RefreshToken 쿠키 생성 시 SameSite=Strict, HttpOnly, Secure 설정 검증")
    void createRefreshTokenCookie_success() {
        ResponseCookie cookie = CookieUtil.createRefreshTokenCookie("dummy-refresh-token", true, 3600);

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEqualTo("dummy-refresh-token");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(3600);
    }

    @Test
    @DisplayName("RefreshToken 삭제 쿠키 생성 시 MaxAge=0, SameSite=Strict 검증")
    void deleteRefreshTokenCookie_success() {
        ResponseCookie cookie = CookieUtil.deleteRefreshTokenCookie(false);

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getMaxAge().getSeconds()).isZero();
    }

    @Test
    @DisplayName("HttpServletResponse에 AddRefreshTokenCookie 호출 시 Set-Cookie 헤더 정상 주입")
    void addRefreshTokenCookie_injectsHeader() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        CookieUtil.addRefreshTokenCookie(response, "test-token", false, 7200);

        String setCookieHeader = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookieHeader).isNotNull();
        assertThat(setCookieHeader).contains("refreshToken=test-token");
        assertThat(setCookieHeader).contains("SameSite=Strict");
        assertThat(setCookieHeader).contains("HttpOnly");
    }
}
