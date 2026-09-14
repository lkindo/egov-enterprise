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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    /** [W1-07] 신뢰 프록시 기본값(사설 대역 포함). 기본 remoteAddr 127.0.0.1 이 신뢰 대상이라 XFF 가 읽힌다. */
    private static final String TRUSTED = "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16";

    private RateLimitFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        // [2026-09-14 ADR-0019] 한도는 JVM 시스템 프로퍼티가 아니라 생성자(설정 속성)로 받는다.
        filter = newFilter(100, 20);
        filterChain = mock(FilterChain.class);
    }

    private static RateLimitFilter newFilter(int requestsPerMinute, int loginRequestsPerMinute) {
        return new RateLimitFilter(new nuri.foundation.security.net.ClientIpResolver(TRUSTED),
                requestsPerMinute, loginRequestsPerMinute);
    }

    private MockHttpServletResponse send(String remoteAddr, String uri) throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        request.setRequestURI(uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, filterChain);
        return response;
    }

    @Test
    @DisplayName("로그인은 전용 한도에서 차단된다 (로그인 20 기준)")
    void testLoginRateLimiting() throws ServletException, IOException {
        for (int i = 0; i < 20; i++) {
            assertEquals(200, send("192.168.0.1", "/api/v1/auth/login").getStatus(), "Attempt " + (i + 1) + " should be allowed");
        }

        MockHttpServletResponse blocked = send("192.168.0.1", "/api/v1/auth/login");

        assertEquals(429, blocked.getStatus());
        assertEquals("application/json;charset=UTF-8", blocked.getContentType());
        // [W0-P1-6 보완] 429 가 관측 가능해야 한다.
        assertEquals(1, filter.rejectedCountForTest(), "429 거절은 카운터에 계상되어야 한다");
    }

    @Test
    @DisplayName("[2026-09-14] 로그인 한도를 다 쓴 IP 도 일반 API 는 계속 쓴다 — 로그인 거절이 전체 한도를 깎지 않는다")
    void loginLimitDoesNotConsumeGeneralLimit() throws ServletException, IOException {
        for (int i = 0; i < 25; i++) {
            send("192.168.0.2", "/api/v1/auth/login");
        }

        assertEquals(429, send("192.168.0.2", "/api/v1/auth/login").getStatus());
        // 허용된 로그인 20건만 전체 한도(100)를 썼으므로 일반 요청 80건이 남는다.
        for (int i = 0; i < 80; i++) {
            assertEquals(200, send("192.168.0.2", "/api/v1/boards").getStatus(), "general request " + (i + 1));
        }
        assertEquals(429, send("192.168.0.2", "/api/v1/boards").getStatus());
    }

    @Test
    @DisplayName("[W0-P1-6] 허용된 요청은 429 카운터를 올리지 않는다 — 카운터가 요청 수가 아니라 거절 수여야 한다")
    void testRejectionCounterCountsOnlyRejections() throws ServletException, IOException {
        for (int i = 0; i < 5; i++) {
            send("192.168.0.77", "/api/v1/boards");
        }

        assertEquals(0, filter.rejectedCountForTest(), "허용된 요청은 거절 카운터에 잡히면 안 된다");
    }

    @Test
    @DisplayName("일반 API 요청은 전체 한도까지 허용된다")
    void testNormalApiRateLimiting() throws ServletException, IOException {
        for (int i = 0; i < 100; i++) {
            assertEquals(200, send("10.0.0.1", "/api/v1/board/list").getStatus());
        }

        assertEquals(429, send("10.0.0.1", "/api/v1/board/list").getStatus());
    }

    @Test
    @DisplayName("[2026-09-14] 한도 0 이하는 모든 요청 거부가 되므로 기동 시점에 거절한다")
    void rejectsNonPositiveLimits() {
        assertThrows(IllegalStateException.class, () -> newFilter(0, 20));
        assertThrows(IllegalStateException.class, () -> newFilter(100, 0));
    }

    /**
     * [W0-14 회귀 게이트] 버킷 맵 무한 증가 차단.
     *
     * <p>버킷 키는 클라이언트 IP 이므로 헤더만 바꿔 보내는 요청으로 엔트리를 무한 생성시켜 OOM 을 만들 수 있었다.
     * 상한(100,000)의 2배를 주입해 맵이 유한하게 유지되는지 확인한다.
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
