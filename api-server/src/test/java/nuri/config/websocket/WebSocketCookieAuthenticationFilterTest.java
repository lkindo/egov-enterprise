package nuri.config.websocket;

import jakarta.servlet.http.Cookie;
import java.util.List;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WebSocketCookieAuthenticationFilterTest {

    private final JwtTokenProvider tokens = mock(JwtTokenProvider.class);
    private final WebSocketCookieAuthenticationFilter filter =
            new WebSocketCookieAuthenticationFilter(tokens, List.of("https://app.example.test"));

    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void httpOnlyCookieAuthenticatesEachSupportedSockJsTransport() throws Exception {
        var principal = current(true);
        when(tokens.validateToken("cookie-token")).thenReturn(true);
        when(tokens.getAuthentication("cookie-token")).thenReturn(principal);
        for (String route : List.of("GET /ws", "GET /ws/info", "GET /ws/websocket",
                "GET /ws/123/session/websocket", "POST /ws/123/session/xhr",
                "POST /ws/123/session/xhr_streaming", "POST /ws/123/session/xhr_send", "HEAD /ws/info")) {
            String[] parts = route.split(" ");
            var request = request(parts[0], parts[1]);
            var chain = new MockFilterChain();
            filter.doFilter(request, new MockHttpServletResponse(), chain);
            assertThat(chain.getRequest()).as(route).isSameAs(request);
            assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(principal);
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void noCookieOrBearerAndTokenInUrlNeverAuthenticate() throws Exception {
        var request = request("GET", "/ws/123/session/websocket");
        request.setCookies();
        request.setParameter("accessToken", "query-token");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(chain.getRequest()).isNull();
        assertThat(response.getContentAsString()).doesNotContain("query-token");
        verifyNoInteractions(tokens);
    }

    @Test
    void foreignMissingDataOriginOrDuplicateOriginsCannotUseCookie() throws Exception {
        for (String origin : List.of("https://other.example.test", "null", "")) {
            var request = request("POST", "/ws/123/session/xhr_send");
            request.removeHeader("Origin");
            if (!origin.isEmpty()) request.addHeader("Origin", origin);
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(403);
        }
        var duplicate = request("GET", "/ws/123/session/websocket");
        duplicate.addHeader("Origin", "https://other.example.test");
        var response = new MockHttpServletResponse();
        filter.doFilter(duplicate, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(403);
        verifyNoInteractions(tokens);
    }

    @Test
    void sameOriginInfoMayOmitOriginButStillNeedsValidCookie() throws Exception {
        var request = request("GET", "/ws/info");
        request.removeHeader("Origin");
        request.addHeader("Sec-Fetch-Site", "same-origin");
        when(tokens.validateToken("cookie-token")).thenReturn(true);
        when(tokens.getAuthentication("cookie-token")).thenReturn(current(true));
        var chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isSameAs(request);
    }

    @Test
    void expiredAndDisabledIdentityAreRejectedBeforeTransport() throws Exception {
        var request = request("GET", "/ws/websocket");
        var invalid = new MockHttpServletResponse();
        filter.doFilter(request, invalid, new MockFilterChain());
        assertThat(invalid.getStatus()).isEqualTo(401);
        when(tokens.validateToken("cookie-token")).thenReturn(true);
        when(tokens.getAuthentication("cookie-token")).thenReturn(current(false));
        var disabled = new MockHttpServletResponse();
        filter.doFilter(request, disabled, new MockFilterChain());
        assertThat(disabled.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void backendFailureReturns503WithoutClearingCookieOrLeakingDetails() throws Exception {
        when(tokens.validateToken("cookie-token")).thenReturn(true);
        when(tokens.getAuthentication("cookie-token"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private-db-detail"));
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request("GET", "/ws/websocket"), response, chain);
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getHeader("Retry-After")).isEqualTo("5");
        assertThat(response.getHeader("Set-Cookie")).isNull();
        assertThat(response.getContentAsString()).doesNotContain("cookie-token", "private-db-detail");
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void ordinaryApiAndUnknownWsPathsNeverReadCookies() throws Exception {
        for (String path : List.of("/api/v1/boards", "/ws/unknown", "/ws/123/session/jsonp", "/ws-other")) {
            var request = request("GET", path);
            var chain = new MockFilterChain();
            filter.doFilter(request, new MockHttpServletResponse(), chain);
            assertThat(chain.getRequest()).isSameAs(request);
        }
        verifyNoInteractions(tokens);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void bearerTransportClientRemainsSupportedWithoutCookieFallbackOnBadHeader() throws Exception {
        var request = request("GET", "/ws/websocket");
        request.setCookies();
        request.addHeader("Authorization", "Bearer header-token");
        when(tokens.resolveToken(request)).thenReturn("header-token");
        when(tokens.validateToken("header-token")).thenReturn(true);
        when(tokens.getAuthentication("header-token")).thenReturn(current(true));
        var chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isSameAs(request);
        var malformed = request("GET", "/ws/websocket");
        malformed.addHeader("Authorization", "Invalid credentials");
        var rejected = new MockHttpServletResponse();
        var rejectedChain = new MockFilterChain();
        filter.doFilter(malformed, rejected, rejectedChain);
        assertThat(rejected.getStatus()).isEqualTo(401);
        assertThat(rejectedChain.getRequest()).isNull();
        org.mockito.Mockito.verify(tokens, org.mockito.Mockito.never()).validateToken("cookie-token");
    }

    @Test
    void duplicateAccessCookiesAreRejectedWithoutGuessingWhichIdentityToUse() throws Exception {
        var request = request("GET", "/ws/websocket");
        request.setCookies(new Cookie("accessToken", "one"), new Cookie("accessToken", "two"));
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(chain.getRequest()).isNull();
        verifyNoInteractions(tokens);
    }

    private static MockHttpServletRequest request(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        request.addHeader("Origin", "https://app.example.test");
        request.setCookies(new Cookie("accessToken", "cookie-token"));
        return request;
    }

    private static UsernamePasswordAuthenticationToken current(boolean enabled) {
        var user = CustomUserDetails.builder().userId("fixture").esntlId("fixture-subject")
                .enabled(enabled).groups(List.of()).authorizationVersion("v1").build();
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}
