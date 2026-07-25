package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OriginValidationFilterTest {

    private OriginValidationFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new OriginValidationFilter(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("허용된 Origin을 가진 POST 요청은 통과한다")
    void allowedOrigin_postRequest_passesFilter() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("Origin", "http://localhost:3000");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("차단된 Origin을 가진 POST 요청은 403 Forbidden 응답으로 차단된다")
    void forbiddenOrigin_postRequest_blocked() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("Origin", "http://evil-attacker.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_ORIGIN");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("GET 요청은 Origin 검증 대상에서 제외되어 통과한다")
    void getRequest_passesFilterWithoutOrigin() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users");
        request.addHeader("Origin", "http://untrusted.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("[회귀] localhost 를 접미사로 위장한 외부 도메인은 차단된다 (부분문자열 매칭 우회 방지)")
    void suffixDomainImpersonatingLocalhost_blocked() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        // serverName 기본값은 "localhost" — contains("localhost") 비교였다면 이 Origin 이 통과했다.
        request.addHeader("Origin", "http://localhost.attacker.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_ORIGIN");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Origin 헤더가 없는 POST 요청(동일 출처/서버 간 호출)은 통과한다")
    void missingOrigin_postRequest_passesFilter() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/reissue");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }
}
