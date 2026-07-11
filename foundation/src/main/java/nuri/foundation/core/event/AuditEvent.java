package nuri.foundation.core.event;

import java.time.LocalDateTime;

/**
 * API 접근 감사 이벤트.
 *
 * <p>{@code OperationalAuditInterceptor}가 요청 완료 시 발행하고, 감사 리스너가 tb_web_log 등으로
 * 비동기 영속화한다. 발행자(api-server)와 영속 구현(business-core)을 이 이벤트로 디커플링한다.
 */
public record AuditEvent(
        String url,
        String userId,
        String clientIp,
        long durationMs,
        LocalDateTime occurredAt
) implements DomainEvent {
}
