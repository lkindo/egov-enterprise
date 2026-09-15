package nuri.foundation.core.event;

/**
 * 어떤 업무 사건이 특정 번호로 문자를 보낼 만한 일이 되었다.
 *
 * <p>{@link MailRequestedEvent} 와 같은 이유로 foundation 에 둔다 — 업무 도메인이 {@code SmsService} 를
 * 직접 주입하면 교차 도메인 결합이 늘고(GAP-ARCH-001), 이벤트를 어느 한쪽 패키지에 두면 반대편의 컴파일
 * 의존이 남아 census 숫자만 내려간다(AGENTS H2).
 *
 * <p><b>발신 번호는 싣지 않는다.</b> 발신 번호는 업무가 아니라 배포 설정({@code nuri.notification.sender.tel})이며
 * sms 도메인이 소유한다. 미설정이면 소비 측이 문자 채널을 건너뛰고 warn 을 남긴다 — 가짜 번호로 발송을
 * 흉내 내는 것보다 안 보내는 쪽이 정직하다.
 *
 * <p><b>발행 시점 규약</b> — {@link MailRequestedEvent} 와 같이 커밋 이후에 발행한다.
 *
 * @param requesterId    발송 요청자 loginId. 발송 이력·로그 귀속에만 쓰이며 인가 판정에 쓰이지 않는다
 * @param recipientTelno 수신자 전화번호. 발행 측이 이미 해석한 값이다
 * @param content        문자 본문
 */
public record SmsRequestedEvent(
        String requesterId,
        String recipientTelno,
        String content
) implements DomainEvent {

    /** 수신 번호가 없으면 문자를 만들 수 없다 — 발행 측에서 걸러야 하지만 소비 측도 방어한다. */
    public boolean hasRecipient() {
        return recipientTelno != null && !recipientTelno.isBlank();
    }
}
