package nuri.business.service.mail;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("LoggingEmailSender 테스트")
class EmailSenderTest {

    /**
     * 이 구현은 로그만 남기므로 검증할 반환값이 없다. 그래도 단언을 명시한다 —
     * 종전에는 호출만 하고 끝나 <b>"예외가 안 나면 통과" 가 의도인지 단언을 빠뜨린 것인지</b>
     * 구분되지 않았다. 단언 0개인 테스트는 그 자체로 신호가 약하다.
     */
    @Test
    @DisplayName("메일 발송이 예외 없이 완료된다")
    void send() {
        LoggingEmailSender sender = new LoggingEmailSender();

        assertThatCode(() -> sender.send("Sub", "Cn", "from", "to"))
                .doesNotThrowAnyException();
    }
}
