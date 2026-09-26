package nuri.business.service.mail;

/**
 * Interface for Email sending logic.
 */
public interface EmailSender {

    /**
     * Sends an email.
     *
     * @param subject the email subject
     * @param content the email content — plain text; implementations must not interpret it as HTML
     * @param from    the sender's email address
     * @param to      the recipient's email address
     * @throws Exception if sending fails
     */
    void send(String subject, String content, String from, String to) throws Exception;

    /**
     * 이 구현이 실제로 메일을 전달하는가(2026-09-26 DIP B5 F7). SMTP 가 없는 배포는 접수는 되지만 모든 메일이
     * 실패로 기록되므로, 작성 화면이 보내기 전에 알린다.
     */
    default boolean isDeliveryConfigured() {
        return true;
    }
}
