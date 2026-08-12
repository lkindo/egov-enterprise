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
}
