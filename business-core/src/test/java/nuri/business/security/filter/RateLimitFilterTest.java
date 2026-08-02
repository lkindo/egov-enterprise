package nuri.business.security.filter;

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
        System.setProperty("ratelimit.capacity", "100");
        // [W1-07] 신뢰 프록시 기본값(사설 대역 포함)으로 구성한다.
        //   MockHttpServletRequest 의 기본 remoteAddr 은 127.0.0.1 이라 신뢰 대상이고,
        //   따라서 X-Forwarded-For 가 읽힌다 — 아래 버킷 상한 테스트가 의도대로 서로 다른 키를 만든다.
        filter = new RateLimitFilter(new nuri.foundation.security.net.ClientIpResolver(
                "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"));
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

    /**
     * [W0-14 회귀 게이트] 버킷 맵 무한 증가 차단.
     *
     * <p>버킷 키는 클라이언트 IP 이고 X-Forwarded-For 는 검증 없이 신뢰되므로, 헤더만 바꿔 보내는
     * 요청으로 엔트리를 무한 생성시켜 OOM 을 만들 수 있었다. 상한(100,000)의 2배를 주입해
     * 맵이 유한하게 유지되는지 확인한다.
     *
     * <p>위반 주입 검증: {@code buckets} 를 ConcurrentHashMap 으로 되돌리면 이 단언이 red 가 된다.
     */
    @Test
    @DisplayName("[W0-14] 서로 다른 IP 가 대량 유입돼도 버킷 맵은 상한 내로 유지된다")
    void testBucketMapIsBounded() throws ServletException, IOException {
        final int injected = 200_000;
        for (int i = 0; i < injected; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest();
            req.setRequestURI("/api/v1/board/list");
            req.addHeader("X-Forwarded-For",
                    "10." + ((i >> 16) & 0xFF) + "." + ((i >> 8) & 0xFF) + "." + (i & 0xFF));
            filter.doFilter(req, new MockHttpServletResponse(), filterChain);
        }

        long size = filter.bucketCountForTest();
        org.junit.jupiter.api.Assertions.assertTrue(size <= 100_000L,
                "버킷 맵이 상한을 초과했다(=무한 증가 회귀): size=" + size + ", 주입=" + injected);
    }
}
