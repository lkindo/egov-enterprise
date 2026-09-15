package nuri.foundation.core.event;

/**
 * 어떤 업무 사건이 특정 주소로 메일을 보낼 만한 일이 되었다.
 *
 * <p><b>왜 foundation 에 두는가</b> — {@link NotificationRequestedEvent} 와 같은 자리다. 업무 도메인이
 * {@code MailService} 를 직접 주입하면 결재·게시판·설문이 저마다 mail 에 결합돼 교차 도메인 결합
 * census 가 늘어난다(GAP-ARCH-001). 이벤트를 발행자나 소비자 어느 한쪽 패키지에 두면 반대편이 그
 * 패키지를 import 하게 되어 <b>주입은 사라져도 컴파일 의존은 그대로 남는다</b> — 그러면 census 숫자만
 * 내려가고 실제로는 어느 도메인도 떼어 낼 수 없다(AGENTS H2 — 신호 은폐).
 *
 * <p><b>수신자는 이미 해석된 주소다.</b> esntlId 를 싣고 mail 도메인이 연락처를 찾게 하면 연락처가 없는
 * 사용자에서 예외가 나므로, 발행 측이 자기 업무 규칙대로 주소를 찾아(없으면 발행하지 않고) 넘긴다.
 * 종전 {@code SanctionEventListener} 의 거동을 그대로 옮긴 것이다.
 *
 * <p><b>발행 시점 규약</b> — 반드시 <b>커밋 이후</b>에 발행한다({@code TransactionUtils.runAfterCommit}).
 * 커밋 전에 발행하면 롤백된 업무에 대한 메일이 나간다 — 메일은 되돌릴 수 없다.
 *
 * @param requesterId      발송 요청자 loginId. 발송 이력·로그 귀속에만 쓰이며 인가 판정에 쓰이지 않는다
 * @param recipientAddress 수신자 이메일 주소. 발행 측이 이미 해석한 값이다
 * @param subject          메일 제목
 * @param content          메일 본문
 */
public record MailRequestedEvent(
        String requesterId,
        String recipientAddress,
        String subject,
        String content
) implements DomainEvent {

    /** 수신 주소가 없으면 메일을 만들 수 없다 — 발행 측에서 걸러야 하지만 소비 측도 방어한다. */
    public boolean hasRecipient() {
        return recipientAddress != null && !recipientAddress.isBlank();
    }
}
