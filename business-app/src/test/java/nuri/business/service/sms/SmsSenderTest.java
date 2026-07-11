package nuri.business.service.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoggingSmsSender 테스트")
class SmsSenderTest {

    @Test
    @DisplayName("SMS 발송 로그 출력 및 결과 확인")
    void send() {
        LoggingSmsSender sender = new LoggingSmsSender();
        boolean result = sender.send("0101", "Hello", "0102");
        assertThat(result).isTrue();
    }
}
