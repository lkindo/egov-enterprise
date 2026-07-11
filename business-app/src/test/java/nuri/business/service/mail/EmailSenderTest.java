package nuri.business.service.mail;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("LoggingEmailSender 테스트")
class EmailSenderTest {

    @Test
    @DisplayName("메일 발송 로그 출력 확인")
    void send() throws Exception {
        LoggingEmailSender sender = new LoggingEmailSender();
        sender.send("Sub", "Cn", "from", "to");
    }
}
