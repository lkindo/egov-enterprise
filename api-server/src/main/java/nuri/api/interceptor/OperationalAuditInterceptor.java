package nuri.api.interceptor;

import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.core.event.PrivacyAccessEvent;
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
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;

/**
 * API 호출 이력을 기록하는 운영 감사 인터셉터.
 *
 * <p>[감사 영속] 요청 완료 시 {@link AuditEvent}를 발행하고, 실제 영속화는 비동기 리스너
 * (business-core {@code WebAuditLogListener}·{@code SystemErrorLogListener}·
 * {@code UserActivityLogAggregator})가 수행한다 — 인터셉터를 영속 구현과 디커플링.
 * 감사 범위는 {@code /api/} 요청으로 한정(정적/actuator 제외).
 *
 * <p>[개인정보 접근] 핸들러에 {@link PrivacyAccess}가 붙어 있고 <b>성공 응답</b>이면
 * {@link PrivacyAccessEvent}를 추가로 발행한다. 실패 응답에는 발행하지 않는다 —
 * 인가 거부(403)나 미존재(404)는 개인정보를 <b>보지 못한</b> 요청이라, 기록하면 증적이
 * 실제 열람과 시도를 구분하지 못하게 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OperationalAuditInterceptor implements HandlerInterceptor {

    private static final String START_ATTR = "nuri.audit.startNanos";

    /** 핸들러를 판정할 수 없을 때 쓰는 HTTP 메서드 표기. */
    private static final String UNKNOWN_METHOD = "UNKNOWN";

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
        int responseStatus = response.getStatus();
        // DispatcherServlet 이 예외를 남긴 채 완료되면 응답 버퍼에는 아직 기본 200이 남을 수 있다.
        // 그 값을 성공으로 감사하면 시스템 오류 로그가 빠지고 @PrivacyAccess 성공 이벤트까지 거짓 발행된다.
        int statusCode = ex != null && responseStatus < 400
                ? HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                : responseStatus;
        HandlerMethod handlerMethod = (handler instanceof HandlerMethod hm) ? hm : null;
        publishAuditEvent(request, handlerMethod, statusCode);
    }

    /**
     * Spring Security가 DispatcherServlet 전에 종료한 API 요청을 같은 감사 이벤트 흐름에 연결한다.
     * 핸들러가 실행되지 않았으므로 개인정보 접근 이벤트는 발생할 수 없다.
     */
    public void publishSecurityFailure(HttpServletRequest request, int statusCode) {
        try {
            publishAuditEvent(request, null, statusCode);
        } catch (RuntimeException eventFailure) {
            // 감사 경로 장애가 인증·인가 응답 자체를 5xx로 바꾸면 안 된다. 요청 값은 로그에 싣지 않는다.
            log.error("보안 필터 감사 이벤트 발행 실패: 상태={}, 예외유형={}",
                    statusCode, eventFailure.getClass().getSimpleName());
        }
    }

    private void publishAuditEvent(HttpServletRequest request, HandlerMethod handlerMethod, int statusCode) {
        String reqURL = request.getRequestURI();
        if (reqURL == null || !reqURL.startsWith("/api/")) {
            return;
        }

        long durationMs = 0L;
        Object start = request.getAttribute(START_ATTR);
        if (start instanceof Long startNanos) {
            durationMs = (System.nanoTime() - startNanos) / 1_000_000L;
        }

        String serviceName = handlerMethod != null ? handlerMethod.getBeanType().getSimpleName() : null;
        String methodName = handlerMethod != null ? handlerMethod.getMethod().getName() : null;
        String httpMethod = request.getMethod() != null ? request.getMethod() : UNKNOWN_METHOD;
        String clientIp = clientIpResolver.resolve(request);
        LocalDateTime occurredAt = LocalDateTime.now();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        eventPublisher.publishEvent(new AuditEvent(
                reqURL,
                httpMethod,
                statusCode,
                resolveLoginId(authentication),
                resolveEsntlId(authentication),
                clientIp,
                durationMs,
                occurredAt,
                serviceName,
                methodName));

        publishPrivacyAccessIfDeclared(handlerMethod, statusCode, serviceName, authentication, clientIp, occurredAt);
    }

    /**
     * 핸들러가 개인정보 접근을 선언했고 성공 응답이면 접근 증적 이벤트를 발행한다.
     *
     * <p>성공 판정은 2xx·3xx 로 한다. 본문이 없는 3xx 라도 조건부 조회(304)는 클라이언트가
     * 이미 받은 개인정보를 계속 쓰는 것이므로 열람으로 본다.
     */
    private void publishPrivacyAccessIfDeclared(HandlerMethod handlerMethod, int statusCode, String serviceName,
            Authentication authentication, String clientIp, LocalDateTime occurredAt) {
        if (handlerMethod == null || statusCode >= 400) {
            return;
        }
        PrivacyAccess privacyAccess = handlerMethod.getMethodAnnotation(PrivacyAccess.class);
        if (privacyAccess == null) {
            return;
        }
        eventPublisher.publishEvent(new PrivacyAccessEvent(
                privacyAccess.value(),
                serviceName,
                resolveLoginId(authentication),
                clientIp,
                occurredAt));
    }

    /** 감사 표기용 loginId. {@code tb_web_log}·{@code tb_sys_log}가 종전부터 쓰던 식별자다. */
    private String resolveLoginId(Authentication authentication) {
        if (isIdentified(authentication)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUserId();
            }
            return authentication.getName();
        }
        return "ANONYMOUS";
    }

    /**
     * 사용자 활동 집계용 esntlId.
     *
     * <p>미인증이거나 {@link CustomUserDetails}가 아니면 <b>null 을 반환한다</b>.
     * {@code tb_user_log.dmnd_user_id}에는 {@code tb_user_info(esntl_id)} FK가 있어
     * 존재하지 않는 값을 넣으면 INSERT 가 통째로 실패한다 — 없는 식별자를 지어내지 않는다.
     */
    private String resolveEsntlId(Authentication authentication) {
        if (isIdentified(authentication) && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return null;
    }

    private boolean isIdentified(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal());
    }
}
