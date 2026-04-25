package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("로그인 요청은 5회 시도 시 차단되어야 함 (Bucket Capacity 100 기준)")
    void testLoginRateLimiting() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.0.1");
        request.setRequestURI("/api/v1/auth/login");

        // 초기 100개 토큰 / 로그인당 5개 소비 = 20번 가능
        // 테스트 편의를 위해 21번 반복
        for (int i = 0; i < 20; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus(), "Attempt " + (i + 1) + " should be allowed");
        }

        // 21번째 요청 (105개째 토큰 요청) -> 차단되어야 함
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilter(request, blockedResponse, filterChain);

        assertEquals(429, blockedResponse.getStatus());
        assertEquals("application/json;charset=UTF-8", blockedResponse.getContentType());
        System.out.println(">>> Blocked Response Body: " + blockedResponse.getContentAsString());
    }

    @Test
    @DisplayName("일반 API 요청은 더 많은 횟수가 허용되어야 함")
    void testNormalApiRateLimiting() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.setRequestURI("/api/v1/board/list");

        // 100번까지 허용
        for (int i = 0; i < 100; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus());
        }

        // 101번째 요청 -> 차단
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilter(request, blockedResponse, filterChain);
        assertEquals(429, blockedResponse.getStatus());
    }
}
