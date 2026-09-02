package nuri.foundation.core.event;

import java.time.LocalDateTime;

/**
 * 개인정보 접근 감사 이벤트.
 *
 * <p>{@link nuri.foundation.core.annotation.PrivacyAccess}가 붙은 핸들러가 <b>성공적으로</b> 응답했을 때만
 * {@code OperationalAuditInterceptor}가 발행하고, {@code PrivacyAccessLogListener}가
 * {@code tb_privacy_log}로 영속화한다.
 *
 * <p><b>왜 {@link AuditEvent}와 분리했나.</b> 개인정보 접근은 전 요청이 아니라 <b>명시적으로 표시한
 * 엔드포인트</b>에서만 발생하는 사실이다. 감사 이벤트에 nullable 필드로 얹으면 "표시하지 않은
 * 엔드포인트"와 "개인정보가 없는 엔드포인트"가 같은 모양이 되어, 나중에 census로 검증할 수 없다.
 *
 * @param inqInfo     조회한 개인정보 항목 서술(애노테이션이 선언한 값)
 * @param serviceName 핸들러 클래스 단순명
 * @param userId      조회자 loginId
 * @param clientIp    조회자 IP
 * @param occurredAt  조회 시각
 */
public record PrivacyAccessEvent(
        String inqInfo,
        String serviceName,
        String userId,
        String clientIp,
        LocalDateTime occurredAt
) implements DomainEvent {
}
