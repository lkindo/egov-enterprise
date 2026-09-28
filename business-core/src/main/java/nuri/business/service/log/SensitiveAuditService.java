package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.log.SensitiveAuditLog;
import nuri.business.domain.log.SensitiveAuditLogRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.event.PrivacyAccessEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SensitiveAuditService implements SensitiveAuditPort {
    private final SensitiveAuditLogRepository repository;
    private final ApplicationEventPublisher events;
    private final ObjectMapper objectMapper;

    private record Snapshot(int version, String actorEsntlId, String clientIp, String targetId,
                            String description, Integer httpStatus) {}

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void attempted(Context context) { persist(context, Outcome.ATTEMPTED, null); }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void prepared(Context context) {
        persist(context, Outcome.PREPARED, null);
        // The legacy privacy screen is a projection of an authorized response preparation, not proof of client receipt.
        events.publishEvent(new PrivacyAccessEvent("[PREPARED] " + context.description(), context.operation(),
                context.actorLoginId(), context.clientIp(), LocalDateTime.now()));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completed(Context context, Outcome outcome, int httpStatus) {
        if (outcome == Outcome.ATTEMPTED || outcome == Outcome.PREPARED || outcome == Outcome.COMMITTED) {
            throw new IllegalArgumentException("Not an HTTP completion outcome");
        }
        persist(context, outcome, httpStatus);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordMutation(String operation, String targetId) {
        recordCommitted(operation, targetId, "민감 작업");
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordMfaRecovery(String targetId, String verificationReference) {
        if (verificationReference == null || !verificationReference.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,199}")) {
            throw new IllegalArgumentException("Invalid verification reference");
        }
        recordCommitted("MFA_RECOVERY_APPROVAL", targetId, "verificationReference=" + verificationReference);
    }

    private void recordCommitted(String operation, String targetId, String description) {
        Context request = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                && attributes.getRequest().getAttribute(REQUEST_ATTRIBUTE) instanceof Context captured) request = captured;
        Context mutation = new Context(request == null ? UUID.randomUUID().toString() : request.requestId(), operation,
                SecurityUtil.getCurrentLoginId().orElse("ANONYMOUS"), SecurityUtil.getCurrentEsntlId().orElse(null),
                request == null ? null : request.clientIp(), description, targetId);
        persist(mutation, Outcome.COMMITTED, null);
    }

    private void persist(Context context, Outcome outcome, Integer status) {
        try {
            String snapshot = objectMapper.writeValueAsString(new Snapshot(1, context.actorEsntlId(), context.clientIp(),
                    context.targetId(), context.description(), status));
            if (snapshot.length() > 4000 || context.operation().length() > 100 || context.requestId().length() > 50) {
                throw new IllegalArgumentException("Audit metadata exceeds reviewed bounds");
            }
            repository.saveAndFlush(SensitiveAuditLog.create(context.requestId(), outcome.name(), context.operation(),
                    snapshot, context.actorLoginId(), LocalDateTime.now()));
        } catch (RuntimeException error) {
            throw new BusinessException(CommonErrorCode.SERVER_OVERLOAD, "감사 기록을 저장할 수 없어 민감 작업을 중단했습니다.");
        }
    }
}
