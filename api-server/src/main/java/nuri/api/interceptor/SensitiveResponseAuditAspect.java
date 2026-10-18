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
            context = withDataSubject(attributes, context);
            audit.prepared(context);
            attributes.getRequest().setAttribute(SensitiveAuditInterceptor.PREPARED, Boolean.TRUE);
        }
        return response;
    }

    /**
     * [2026-10-18] 핸들러가 한 사람의 개인정보를 돌려준다고 표시했으면(PrivacySubject) 그 사람의 esntlId 를 대상 좌표에 싣는다.
     * 준비(PREPARED)·완료 원장과 개인정보 접근 기록이 같은 대상을 남기도록 요청의 감사 문맥도 바꾼다. 이미 대상이 있으면 그대로다.
     */
    private static SensitiveAuditPort.Context withDataSubject(ServletRequestAttributes attributes,
            SensitiveAuditPort.Context context) {
        if (context.targetId() != null
                || !(attributes.getRequest().getAttribute(nuri.foundation.core.audit.PrivacySubject.REQUEST_ATTRIBUTE)
                instanceof String subject)) {
            return context;
        }
        SensitiveAuditPort.Context identified = new SensitiveAuditPort.Context(context.requestId(), context.operation(),
                context.actorLoginId(), context.actorEsntlId(), context.clientIp(), context.description(), subject);
        attributes.getRequest().setAttribute(SensitiveAuditPort.REQUEST_ATTRIBUTE, identified);
        return identified;
    }
}
