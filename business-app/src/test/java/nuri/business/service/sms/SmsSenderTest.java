package nuri.business.service.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoggingSmsSender 테스트")
class SmsSenderTest {

    @Test
    @DisplayName("비운영 스텁은 민감 본문을 전달하지 않으며 성공을 가장하지 않음")
    void send() {
        LoggingSmsSender sender = new LoggingSmsSender();
        boolean result = sender.send("01012345678", "민감한 인증번호 123456", "0212345678");
        assertThat(result).isFalse();

        Profile profile = LoggingSmsSender.class.getAnnotation(Profile.class);
        assertThat(profile).isNotNull();
        assertThat(profile.value()).containsExactly("!prod");
    }

    @Test
    @DisplayName("운영 게이트웨이 미구성 구현도 성공을 가장하지 않음")
    void productionGatewayUnavailable() {
        UnavailableSmsSender sender = new UnavailableSmsSender();

        assertThat(sender.send("01012345678", "민감한 인증번호 123456", "0212345678")).isFalse();

        Profile profile = UnavailableSmsSender.class.getAnnotation(Profile.class);
        assertThat(profile).isNotNull();
        assertThat(profile.value()).containsExactly("prod");
    }

    /**
     * 현재 배포된 두 구현은 <b>어느 것도 실제로 전달하지 않는다</b>. 화면은 이 값으로
     * "접수는 되지만 전달되지 않는다" 배너를 띄우므로, 스텁이 실수로 true 를 반환하면
     * 관리자가 전달을 기대하게 된다 — 거짓 안심은 침묵보다 나쁘다.
     */
    @Test
    @DisplayName("두 스텁 모두 발송 가능으로 자신을 신고하지 않는다")
    void stubsNeverReportDeliveryConfigured() {
        assertThat(new LoggingSmsSender().isDeliveryConfigured()).isFalse();
        assertThat(new UnavailableSmsSender().isDeliveryConfigured()).isFalse();
    }

    /**
     * 기본값이 {@code false} 라 새 구현체가 이 메서드를 잊어도 "연결됨" 으로 표시되지 않는다.
     * 실제 공급자 어댑터만 명시적으로 true 를 선언해야 한다.
     */
    @Test
    @DisplayName("인터페이스 기본값은 미연결이다 — 선언하지 않은 구현체는 연결됨으로 표시되지 않는다")
    void defaultIsNotConfigured() {
        SmsSender bareImplementation = (recipient, message, sender) -> false;

        assertThat(bareImplementation.isDeliveryConfigured()).isFalse();
    }
}
