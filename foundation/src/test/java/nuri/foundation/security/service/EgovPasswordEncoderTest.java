package nuri.foundation.security.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("전자정부 호환 패스워드 인코더 테스트")
class EgovPasswordEncoderTest {

    private final EgovPasswordEncoder passwordEncoder = new EgovPasswordEncoder();

    @Test
    @DisplayName("솔트를 이용한 암호화 및 매칭")
    void encodeAndMatchWithSalt() {
        // given
        String rawPassword = "password123!";
        String salt = "user001";

        // when
        String encoded = passwordEncoder.encode(rawPassword, salt);
        boolean isMatch = passwordEncoder.matches(rawPassword, encoded, salt);
        boolean isNotMatch = passwordEncoder.matches("wrong_password", encoded, salt);

        // then
        assertThat(encoded).isNotNull();
        assertThat(isMatch).isTrue();
        assertThat(isNotMatch).isFalse();
    }

    @Test
    @DisplayName("기본 encode 메서드 호출 시 예외 발생")
    void encodeFail() {
        assertThatThrownBy(() -> passwordEncoder.encode("password"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("requires user ID as salt");
    }

    @Test
    @DisplayName("솔트 없이 matches 호출 시 경고 및 false 반환")
    void matchesFailWithoutSalt() {
        assertThat(passwordEncoder.matches("password", "encoded")).isFalse();
    }

    @Test
    @DisplayName("NULL 입력 케이스")
    void nullCheck() {
        assertThat(passwordEncoder.matches(null, null, null)).isFalse();
        assertThat(passwordEncoder.matches("raw", null, "salt")).isFalse();
        assertThat(passwordEncoder.matches("raw", "encoded", null)).isFalse();
    }
}
