package nuri.business.security.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Enterprise Rate Limiting Filter using Bucket4j
 * Prevents brute-force and DoS attacks with token bucket algorithm.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Profile("!stress-test & !bottleneck-test")
public class RateLimitFilter implements Filter {

    /** 버킷 맵 상한. 초과 시 W-TinyLFU 가 저빈도 키부터 축출한다. */
    private static final long MAX_BUCKETS = 100_000L;

    /**
     * 미접근 축출 시간. refill 주기(1분)보다 충분히 길어야 한다 —
     * 이보다 짧으면 '축출 = 즉시 한도 리셋'이 되어 대기만으로 제한을 우회할 수 있다.
     */
    private static final long EXPIRE_AFTER_ACCESS_MINUTES = 10L;

    /**
     * [W0-14] 종전에는 무제한 ConcurrentHashMap 이었다. 버킷 키가 클라이언트 IP 이고
     * X-Forwarded-For 는 검증 없이 신뢰되므로(getClientIp 참조), 헤더만 바꿔 보내는 요청으로
     * 엔트리를 무한히 생성시켜 OOM 을 유발할 수 있었다. 상한 + 미접근 축출로 유한화한다.
     *
     * <p>⚠ 이 변경이 줄이는 것은 '버킷 맵의 크기'이지 '허용 요청 수'가 아니다.
     * 레이트 한도(capacity)는 그대로다.
     * <p>⚠ 이것은 메모리 무한 증가만 막는다. XFF 위조를 통한 레이트리밋 우회 자체는
     * 신뢰 프록시 경계(Wave 1)에서 해소된다 — 이 항목 완료를 '레이트리밋이 견고해졌다'로 읽지 말 것.
     */
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(MAX_BUCKETS)
            .expireAfterAccess(EXPIRE_AFTER_ACCESS_MINUTES, TimeUnit.MINUTES)
            .build();

    private Bucket createNewBucket() {
        // Default: 10000 requests per minute for stable E2E testing
        // Can be overridden by system property for unit tests
        int capacity = Integer.getInteger("ratelimit.capacity", 10000);
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, Duration.ofMinutes(1))
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (!(request instanceof HttpServletRequest httpRequest)) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(httpRequest);
        Bucket bucket = buckets.get(clientIp, k -> createNewBucket());

        // Sensitive endpoints (e.g., login) consume more tokens
        int tokensToConsume = httpRequest.getRequestURI().contains("/auth/login") ? 5 : 1;

        if (bucket.tryConsume(tokensToConsume)) {
            chain.doFilter(request, response);
        } else {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setHeader("X-Rate-Limit-Retry-After-Seconds", "60");
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"C429\",\"message\":\"Rate limit exceeded. Too many requests from this IP.\"}");
        }
    }

    /**
     * 테스트 전용 — 버킷 맵이 유한함을 검증하기 위한 크기 조회.
     * Caffeine 의 축출은 비동기이므로 cleanUp() 으로 수렴시킨 뒤 추정 크기를 반환한다.
     */
    long bucketCountForTest() {
        buckets.cleanUp();
        return buckets.estimatedSize();
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0];
        }
        return request.getRemoteAddr();
    }
}
