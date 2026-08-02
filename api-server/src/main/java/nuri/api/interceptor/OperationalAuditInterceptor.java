package nuri.api.interceptor;

import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.net.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;

/**
 * API 호출 이력을 기록하는 운영 감사 인터셉터.
 *
 * <p>[감사 영속] 요청 완료 시 {@link AuditEvent}를 발행하고, 실제 영속화는 비동기 리스너
 * (business-core {@code WebAuditLogListener})가 수행한다 — 인터셉터를 영속 구현과 디커플링.
 * 감사 범위는 {@code /api/} 요청으로 한정(정적/actuator 제외).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OperationalAuditInterceptor implements HandlerInterceptor {

    private static final String START_ATTR = "nuri.audit.startNanos";

    private final ApplicationEventPublisher eventPublisher;
    // [W1-07] 신뢰 경계 기반 IP 판정. 정적 유틸이던 것을 foundation 빈으로 통합했다.
    //   종전에는 X-Forwarded-For 를 무조건 신뢰해 감사 로그의 IP 를 누구나 위조할 수 있었다 —
    //   사후 추적의 근거가 되는 값이라 위조 가능성 자체가 감사를 무의미하게 만든다.
    private final ClientIpResolver clientIpResolver;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_ATTR, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String reqURL = request.getRequestURI();
        if (reqURL == null || !reqURL.startsWith("/api/")) {
            return;
        }

        long durationMs = 0L;
        Object start = request.getAttribute(START_ATTR);
        if (start instanceof Long startNanos) {
            durationMs = (System.nanoTime() - startNanos) / 1_000_000L;
        }

        eventPublisher.publishEvent(
                new AuditEvent(reqURL, resolveUserId(), clientIpResolver.resolve(request), durationMs, LocalDateTime.now()));
    }

    private String resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUserId();
            }
            return authentication.getName();
        }
        return "ANONYMOUS";
    }
}
