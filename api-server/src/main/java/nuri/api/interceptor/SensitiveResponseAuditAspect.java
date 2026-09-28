package nuri.api.interceptor;

import lombok.RequiredArgsConstructor;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Runs before Spring's return-value handler can serialize JSON, copy Resource, or start async streaming. */
@Aspect
@Component
@RequiredArgsConstructor
public class SensitiveResponseAuditAspect {
    private final SensitiveAuditPort audit;

    @Around("@annotation(privacyAccess)")
    public Object beforeResponseBytes(ProceedingJoinPoint invocation, PrivacyAccess privacyAccess) throws Throwable {
        Object response = invocation.proceed(); // Includes method authorization and domain/object checks.
        if (response instanceof ResponseEntity<?> entity && !entity.getStatusCode().is2xxSuccessful()
                && entity.getStatusCode().value() != 304) return response;
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)
                || !(attributes.getRequest().getAttribute(SensitiveAuditPort.REQUEST_ATTRIBUTE)
                instanceof SensitiveAuditPort.Context context)) {
            throw new BusinessException(CommonErrorCode.SERVER_OVERLOAD, "민감 응답 감사 준비를 확인할 수 없습니다.");
        }
        if (attributes.getRequest().getAttribute(SensitiveAuditInterceptor.PREPARED) == null) {
            audit.prepared(context);
            attributes.getRequest().setAttribute(SensitiveAuditInterceptor.PREPARED, Boolean.TRUE);
        }
        return response;
    }
}
