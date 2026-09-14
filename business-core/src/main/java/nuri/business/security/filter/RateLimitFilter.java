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

    /** [W1-07] 감사 로그·로그인 IP 제한과 동일한 신뢰 경계 판정을 공유한다. */
    private final nuri.foundation.security.net.ClientIpResolver clientIpResolver;

    /**
     * [2026-09-14 ADR-0019] 한도는 운영 설정으로 받는다.
     *
     * <p>종전에는 {@code Integer.getInteger("ratelimit.capacity", 10000)} — JVM 시스템 프로퍼티만 읽어 운영에서
     * 바꿀 방법이 없었고(설정하는 곳이 테스트뿐), 로그인은 같은 버킷에서 5토큰을 써 IP 당 분당 약 2,000회였다.
     * 기본값은 그 동작을 그대로 옮긴다(전체 10,000 · 로그인 2,000). 낮추는 것은 신뢰 앞단 프록시로 IP 가
     * 사용자별로 들어오는 것을 확인하고 429 로그를 관측한 뒤다(application.yml 순서 주석). 먼저 낮추면 한 IP 로
     * 모인 전사 로그인이 한꺼번에 막힌다.
     */
    private final int requestsPerMinute;
    private final int loginRequestsPerMinute;

    public RateLimitFilter(nuri.foundation.security.net.ClientIpResolver clientIpResolver,
            @org.springframework.beans.factory.annotation.Value("${nuri.security.rate-limit.requests-per-minute:10000}") int requestsPerMinute,
            @org.springframework.beans.factory.annotation.Value("${nuri.security.rate-limit.login-requests-per-minute:2000}") int loginRequestsPerMinute) {
        if (requestsPerMinute < 1 || loginRequestsPerMinute < 1) {
            // 0 이하는 "제한 없음" 이 아니라 모든 요청 거부가 된다 — 조용히 전체 장애로 뜨지 않게 기동에서 막는다.
            throw new IllegalStateException("요청 제한 한도는 1 이상이어야 합니다: requests-per-minute="
                    + requestsPerMinute + ", login-requests-per-minute=" + loginRequestsPerMinute);
        }
        this.clientIpResolver = clientIpResolver;
        this.requestsPerMinute = requestsPerMinute;
        this.loginRequestsPerMinute = loginRequestsPerMinute;
    }

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
    private final Cache<String, Bucket> buckets = newBucketCache();

    /** 로그인 전용 버킷. 전체 버킷과 같은 상한·축출 규칙을 쓴다(키 무한 증가 방어는 동일하게 필요하다). */
    private final Cache<String, Bucket> loginBuckets = newBucketCache();

    private static Cache<String, Bucket> newBucketCache() {
        return Caffeine.newBuilder()
                .maximumSize(MAX_BUCKETS)
                .expireAfterAccess(EXPIRE_AFTER_ACCESS_MINUTES, TimeUnit.MINUTES)
                .build();
    }

    private static Bucket perMinuteBucket(int capacity) {
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
        boolean login = httpRequest.getRequestURI().contains("/auth/login");

        // 로그인은 전용 버킷을 먼저 본다 — 로그인 한도를 넘긴 요청이 전체 한도까지 깎지 않게 한다.
        String deniedBy = null;
        if (login && !loginBuckets.get(clientIp, k -> perMinuteBucket(loginRequestsPerMinute)).tryConsume(1)) {
            deniedBy = "login";
        } else if (!buckets.get(clientIp, k -> perMinuteBucket(requestsPerMinute)).tryConsume(1)) {
            deniedBy = "all";
        }

        if (deniedBy == null) {
            chain.doFilter(request, response);
        } else {
            recordRejection(httpRequest, clientIp, deniedBy);

            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setHeader("X-Rate-Limit-Retry-After-Seconds", "60");
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"C429\",\"message\":\"Rate limit exceeded. Too many requests from this IP.\"}");
        }
    }

    /**
     * 429 거절을 관측 가능하게 남긴다. [W0-P1-6 보완 — 2026-08-03]
     *
     * <p>Wave 0 의 P1-6 은 ① Caffeine 교체(유계화) ② <b>429 로깅·카운터</b> 를 함께 요구했는데
     * ①만 이행됐다. 그 결과 레이트리밋이 <b>실제로 발동하는지, 누가 얼마나 맞고 있는지</b> 를
     * 운영에서 알 방법이 없었다 — 버킷 맵을 유계로 만든 이번 조치의 부작용(축출로 인한 한도 리셋)이
     * 실제로 일어나는지조차 사후 검증할 신호가 없다.
     *
     * <p>[왜 WARN 인가] 429 는 정상 동작이지만 <b>드물어야 정상</b>이다. 상시 발생하면 그 자체가
     * 설정 오류(용량 과소)이거나 공격 신호다. INFO 로 두면 운영 로그에서 묻힌다.
     * 반대로 ERROR 로 두면 정상 방어 동작이 알람을 무디게 만든다(W1-D4 가 고친 그 패턴).
     *
     * <p>[메트릭이 아니라 로그인 이유] business-core 는 Micrometer 를 선택 의존으로만 쓴다.
     * 여기서 {@code MeterRegistry} 를 생성자 주입하면 그 빈이 없는 컨텍스트(단위 테스트 슬라이스 등)에서
     * 필터 생성이 실패해 <b>레이트리밋이 통째로 빠진 채 테스트가 초록</b>이 되는 위험이 있다.
     * 카운터는 프로세스 내부 {@link java.util.concurrent.atomic.AtomicLong} 으로 두고, 로그를 1차 신호로 삼는다.
     * 외부 카운터가 필요해지면 선택 주입과 actuator 노출면을 함께 설계한다. 그 전까지는 429 로그가
     * 운영 관측 계약이고 이 값은 프로세스 내부 진단용이다.
     */
    private void recordRejection(HttpServletRequest request, String clientIp, String deniedBy) {
        long total = rejectedCount.incrementAndGet();
        // bucket 은 한도 조정의 근거다 — 로그인 한도와 전체 한도 중 어느 쪽이 막았는지 로그만으로 구분돼야 한다.
        LOG.warn("[RATE-LIMIT] 429 거절 — ip={} method={} uri={} bucket={} 누적={}",
                nuri.foundation.security.util.SafeLog.text(clientIp), nuri.foundation.security.util.SafeLog.text(request.getMethod()),
                nuri.foundation.security.util.SafeLog.text(request.getRequestURI()), deniedBy, total);
    }

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(RateLimitFilter.class);

    /** 프로세스 기동 이후 누적 429 거절 수. 재시작 시 0 으로 돌아간다(장기 추세는 로그 집계로 본다). */
    private final java.util.concurrent.atomic.AtomicLong rejectedCount =
            new java.util.concurrent.atomic.AtomicLong();

    /** 테스트 전용 — 429 카운터가 실제로 증가하는지 검증한다. */
    long rejectedCountForTest() {
        return rejectedCount.get();
    }

    /**
     * 테스트 전용 — 버킷 맵이 유한함을 검증하기 위한 크기 조회.
     * Caffeine 의 축출은 비동기이므로 cleanUp() 으로 수렴시킨 뒤 추정 크기를 반환한다.
     */
    long bucketCountForTest() {
        buckets.cleanUp();
        return buckets.estimatedSize();
    }

    /**
     * [W1-07] 신뢰 경계 기반 판정으로 통합.
     *
     * <p>종전 구현은 {@code X-Forwarded-For} 의 <b>첫 항목을 무조건</b> 채택했다. 그 값은 클라이언트가
     * 임의로 넣을 수 있으므로, 헤더를 바꿔가며 요청하면 매번 새 버킷이 만들어져
     * <b>레이트리밋이 통째로 무력화</b>됐다(동시에 버킷 맵 무한 증가의 입력이기도 했다 — W0-14).
     *
     * <p>이제 피어가 신뢰 프록시일 때만 XFF 를 읽는다. 판정 로직은 감사 로그·로그인 IP 제한과
     * 동일한 {@link ClientIpResolver} 를 공유한다 — 종전에는 두 벌의 서로 다른 구현이 있었고
     * 모듈이 갈려 있어(business-core 는 api-server 를 볼 수 없다) 합칠 수 없었다.
     */
    private String getClientIp(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }
}
