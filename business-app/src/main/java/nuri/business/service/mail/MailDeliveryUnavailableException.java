package nuri.business.service.mail;

/** SMTP 미설정은 재시도로 해결되지 않으며 발송 성공으로 기록할 수 없다. */
public class MailDeliveryUnavailableException extends IllegalStateException {
    public MailDeliveryUnavailableException() {
        super("SMTP delivery is not configured");
    }
}
