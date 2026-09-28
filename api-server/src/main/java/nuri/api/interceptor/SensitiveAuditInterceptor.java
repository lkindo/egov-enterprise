package nuri.api.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.annotation.SensitiveOperation;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.audit.SensitiveAuditPort.Context;
import nuri.foundation.core.audit.SensitiveAuditPort.Outcome;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.security.net.ClientIpResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.http.server.PathContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.AsyncHandlerInterceptor;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/** The durable ATTEMPTED barrier precedes handler invocation; completion never implies client receipt. */
@Slf4j
@Component
public class SensitiveAuditInterceptor implements AsyncHandlerInterceptor {
    private static final String FINISHED = "nuri.audit.sensitiveFinished";
    static final String PREPARED = "nuri.audit.sensitivePrepared";
    private final SensitiveAuditPort audit;
    private final ClientIpResolver clientIp;
    private final ObjectProvider<RequestMappingHandlerMapping> handlers;

    public SensitiveAuditInterceptor(SensitiveAuditPort audit, ClientIpResolver clientIp,
            @Qualifier("requestMappingHandlerMapping") ObjectProvider<RequestMappingHandlerMapping> handlers) {
        this.audit = audit;
        this.clientIp = clientIp;
        this.handlers = handlers;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method) || description(method) == null
                || request.getAttribute(SensitiveAuditPort.REQUEST_ATTRIBUTE) != null) return true;
        var actorLoginId = SecurityUtil.getCurrentLoginId();
        Context context = new Context(UUID.randomUUID().toString(), operation(method),
                actorLoginId.orElse("ANONYMOUS"),
                actorLoginId.isPresent() ? SecurityUtil.getCurrentEsntlId().orElse(null) : null,
                clientIp.resolve(request), description(method), null);
        audit.attempted(context); // Failure escapes before any sensitive handler/body is run.
        request.setAttribute(SensitiveAuditPort.REQUEST_ATTRIBUTE, context);
        request.setAttribute(FINISHED, new AtomicBoolean());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (!(request.getAttribute(SensitiveAuditPort.REQUEST_ATTRIBUTE) instanceof Context context)
                || !(request.getAttribute(FINISHED) instanceof AtomicBoolean finished)
                || !finished.compareAndSet(false, true)) return;
        int status = ex != null && response.getStatus() < 400 ? 500 : response.getStatus();
        Outcome outcome = Boolean.TRUE.equals(request.getAttribute(SensitiveAuditResponseFilter.OUTPUT_FAILED)) || interrupted(ex) ? Outcome.INTERRUPTED
                : status == 401 || status == 403 ? Outcome.DENIED
                : ex != null || status >= 400 ? Outcome.FAILED
                : status == 304 ? Outcome.NOT_MODIFIED : Outcome.SUCCEEDED;
        try {
            audit.completed(context, outcome, status);
        } catch (RuntimeException unavailable) {
            // ATTEMPTED/PREPARED remains unresolved. Never rewrite it to a fabricated success.
            log.error("민감 요청 종료 감사 실패: 요청={}, 단계={}", context.requestId(), outcome);
        }
    }

    /** Security-filter denials happen before MVC; resolve declarations from the actual handler mappings. */
    @EventListener
    public void securityDenied(AuditEvent event) {
        if (event.serviceName() != null || event.statusCode() != 401 && event.statusCode() != 403) return;
        var mapping = handlers.getIfAvailable();
        if (mapping == null) return;
        var path = PathContainer.parsePath(event.url());
        mapping.getHandlerMethods().entrySet().stream()
                .filter(entry -> description(entry.getValue()) != null)
                .filter(entry -> entry.getKey().getMethodsCondition().getMethods().stream()
                        .anyMatch(method -> method.name().equals("HEAD".equals(event.httpMethod()) ? "GET" : event.httpMethod())))
                .filter(entry -> entry.getKey().getPathPatternsCondition() != null
                        && entry.getKey().getPathPatternsCondition().getPatterns().stream().anyMatch(pattern -> pattern.matches(path)))
                .sorted(java.util.Comparator.comparing(entry -> entry.getKey().getPathPatternsCondition().getPatterns().stream()
                        .filter(pattern -> pattern.matches(path))
                        .min(org.springframework.web.util.pattern.PathPattern.SPECIFICITY_COMPARATOR).orElseThrow(),
                        org.springframework.web.util.pattern.PathPattern.SPECIFICITY_COMPARATOR))
                .findFirst().ifPresent(entry -> {
                    var method = entry.getValue();
                    var context = new Context(UUID.randomUUID().toString(), operation(method), event.userId(),
                            event.esntlId(), event.clientIp(), description(method), null);
                    audit.attempted(context);
                    audit.completed(context, Outcome.DENIED, event.statusCode());
                });
    }

    static String description(HandlerMethod method) {
        var privacy = method.getMethodAnnotation(PrivacyAccess.class);
        var mutation = method.getMethodAnnotation(SensitiveOperation.class);
        return privacy != null ? privacy.value() : mutation != null ? mutation.value() : null;
    }

    private static String operation(HandlerMethod method) {
        return method.getBeanType().getSimpleName() + "#" + method.getMethod().getName();
    }

    private static boolean interrupted(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof IOException || cause instanceof org.springframework.web.context.request.async.AsyncRequestTimeoutException) return true;
        }
        return false;
    }
}
