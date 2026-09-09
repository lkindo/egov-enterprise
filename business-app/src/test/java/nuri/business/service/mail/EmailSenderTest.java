package nuri.business.service.mail;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LoggingEmailSender 테스트")
class EmailSenderTest {

    @Test
    @DisplayName("SMTP 미설정은 성공으로 반환하지 않는다")
    void send() {
        LoggingEmailSender sender = new LoggingEmailSender();

        assertThatThrownBy(() -> sender.send("Sub", "Cn", "from", "to"))
                .isInstanceOf(MailDeliveryUnavailableException.class);
    }
}
