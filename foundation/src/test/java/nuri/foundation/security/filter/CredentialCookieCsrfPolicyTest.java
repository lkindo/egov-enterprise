package nuri.foundation.security.filter;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CredentialCookieCsrfPolicy — 쿠키 자격을 실은 쓰기 요청만 CSRF 토큰을 요구한다")
class CredentialCookieCsrfPolicyTest {

    @Test
    @DisplayName("쿠키 자격을 실은 쓰기 요청은 토큰을 요구한다")
    void credentialCookieWritesRequireToken() {
        for (String method : new String[] {"POST", "PUT", "PATCH", "DELETE"}) {
            MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/v1/boards");
            request.setCookies(new Cookie("accessToken", "a"));
            assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(request)).as(method).isTrue();
        }
        MockHttpServletRequest refresh = new MockHttpServletRequest("POST", "/api/v1/auth/reissue");
        refresh.setCookies(new Cookie("refreshToken", "r"), new Cookie("XSRF-TOKEN", "t"));
        assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(refresh)).isTrue();
    }

    @Test
    @DisplayName("모르는 쿠키도 자격으로 본다(fail-closed)")
    void unknownCookiesCountAsCredentials() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/boards");
        request.setCookies(new Cookie("someNewCredential", "x"));
        assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(request)).isTrue();
    }

    @Test
    @DisplayName("안전한 메서드와 쿠키 자격이 없는 요청은 토큰을 요구하지 않는다")
    void safeMethodsAndHeaderOnlyClientsAreNotForgeable() {
        MockHttpServletRequest read = new MockHttpServletRequest("GET", "/api/v1/boards");
        read.setCookies(new Cookie("accessToken", "a"));
        assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(read)).isFalse();

        MockHttpServletRequest bearerOnly = new MockHttpServletRequest("POST", "/api/v1/boards");
        bearerOnly.addHeader("Authorization", "Bearer header-token");
        assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(bearerOnly)).isFalse();

        MockHttpServletRequest displayCookiesOnly = new MockHttpServletRequest("DELETE", "/api/v1/boards/1");
        displayCookiesOnly.setCookies(new Cookie("XSRF-TOKEN", "t"), new Cookie("session_exp", "1"));
        assertThat(CredentialCookieCsrfPolicy.REQUIRES_TOKEN.matches(displayCookiesOnly)).isFalse();
    }

    @Test
    @DisplayName("토큰 쿠키는 JavaScript 가 읽을 수 있고 SameSite=Strict, Secure 는 설정을 따른다")
    void tokenCookieIsScriptReadableStrictAndFollowsSecureSetting() {
        for (boolean secure : new boolean[] {true, false}) {
            var repository = CredentialCookieCsrfPolicy.tokenRepository(secure);
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/boards");
            MockHttpServletResponse response = new MockHttpServletResponse();
            CsrfToken token = repository.generateToken(request);
            repository.saveToken(token, request, response);

            // Servlet 6 컨테이너는 SameSite 를 Cookie 속성으로 내보낸다(목 응답의 헤더 문자열에는 싣지 않는다).
            Cookie cookie = response.getCookie(CredentialCookieCsrfPolicy.TOKEN_COOKIE);
            assertThat(cookie).isNotNull();
            assertThat(cookie.getValue()).isEqualTo(token.getToken());
            assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
            assertThat(cookie.isHttpOnly()).isFalse();
            assertThat(cookie.getSecure()).as("secure=%s", secure).isEqualTo(secure);
            assertThat(token.getHeaderName()).isEqualTo("X-XSRF-TOKEN");
        }
    }
}
