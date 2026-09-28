package nuri.foundation.core.event;

import java.time.LocalDateTime;

/**
 * 개인정보 접근 감사 이벤트.
 *
 * <p>민감 응답 전 PREPARED 원장과 같은 트랜잭션에서 동기 발행한다.
 * 기존 tb_privacy_log 화면의 준비 투영이며, 실제 수신 완료나 단순 시도와 구분한다.
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
