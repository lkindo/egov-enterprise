package nuri.business.service.sms;

/**
 * Interface for SMS sending logic
 */
public interface SmsSender {

    /**
     * Sends an SMS message.
     *
     * @param recipientPhone the recipient's phone number
     * @param message the message content
     * @param senderPhone the sender's phone number
     * @return {@code true} only when the real gateway has accepted delivery; simulations/placeholders must return false
     */
    boolean send(String recipientPhone, String message, String senderPhone);

    /**
     * 이 배포에 <b>실제 발송 게이트웨이</b>가 연결돼 있는가.
     *
     * <p><b>왜 필요한가.</b> 현재 구현 두 개는 모두 발송하지 않는다({@code LoggingSmsSender},
     * {@code UnavailableSmsSender}). 그래서 관리자가 문자를 보내면 접수는 되지만 수신자 결과는
     * 전부 'F' 가 되는데, 화면에는 그 사실을 <b>미리</b> 알 방법이 없었다 — 보내 보고 나서
     * 수신자 결과를 열어야 알 수 있었다. 발송 파이프라인은 정상 동작하므로 이는 장애가 아니라
     * <b>배포 형상</b>이고, 형상은 시도 전에 말해 줘야 한다.
     *
     * <p><b>기본값이 {@code false} 인 이유.</b> 새 구현체가 이 메서드를 잊으면 "연결됨" 으로
     * 표시되어 관리자가 전달을 기대하게 된다 — 거짓 안심은 침묵보다 나쁘다. 실제 공급자
     * 어댑터만 {@code true} 로 <b>명시적으로 선언</b>한다.
     *
     * @return 실제 공급자 게이트웨이가 연결돼 있으면 {@code true}
     */
    default boolean isDeliveryConfigured() {
        return false;
    }
}
