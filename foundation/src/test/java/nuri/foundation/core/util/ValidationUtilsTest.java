package nuri.foundation.core.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ValidationUtils 단위 테스트")
class ValidationUtilsTest {

    @Test
    @DisplayName("required(T value) - null이 아님")
    void required_notNull() {
        String value = "test";
        assertThat(ValidationUtils.required(value)).isEqualTo(value);
    }

    @Test
    @DisplayName("required(T value) - null인 경우 예외 발생")
    void required_null() {
        assertThatThrownBy(() -> ValidationUtils.required(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("값은 null 일 수 없습니다");
    }

    @Test
    @DisplayName("required(T value, String message) - null이 아님")
    void required_message_notNull() {
        String value = "test";
        assertThat(ValidationUtils.required(value, "error")).isEqualTo(value);
    }

    @Test
    @DisplayName("required(T value, String message) - null인 경우 예외 발생")
    void required_message_null() {
        assertThatThrownBy(() -> ValidationUtils.required((String) null, "custom message"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("custom message");
    }

    @Test
    @DisplayName("notBlank - 성공")
    void notBlank_success() {
        assertThat(ValidationUtils.notBlank("test")).isEqualTo("test");
        assertThat(ValidationUtils.notBlank(" test ")).isEqualTo(" test ");
    }

    @Test
    @DisplayName("notBlank - null 또는 공백 시 예외 발생")
    void notBlank_fail() {
        assertThatThrownBy(() -> ValidationUtils.notBlank(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notBlank(""))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notBlank("   "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("notBlank(String, String) - 커스텀 메시지")
    void notBlank_message_fail() {
        assertThatThrownBy(() -> ValidationUtils.notBlank(null, "message"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("message");
    }

    // [2026-08-09 뮤테이션 보강] notBlank(message)·notEmpty 계열이 NO_COVERAGE 였다.
    //   이 계열은 **잘못된 입력을 여기서 막지 못하면 더 깊은 곳에서 터진다** —
    //   그때는 원인이 입력이었다는 사실이 이미 가려져 있다.

    @Test
    @DisplayName("notBlank: null·빈문자·공백만 있는 값을 모두 막는다")
    void notBlankRejectsNullEmptyAndWhitespace() {
        assertThatThrownBy(() -> ValidationUtils.notBlank(null, "이름은 필수입니다"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("이름은 필수입니다");
        assertThatThrownBy(() -> ValidationUtils.notBlank("", "이름은 필수입니다"))
                .isInstanceOf(IllegalArgumentException.class);
        // 공백만 있는 값을 통과시키면 "이름이 ' ' 인 사용자" 가 생긴다.
        assertThatThrownBy(() -> ValidationUtils.notBlank("   ", "이름은 필수입니다"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("notBlank: 유효한 값은 그대로 돌려준다")
    void notBlankReturnsInputUnchanged() {
        assertThat(ValidationUtils.notBlank(" 홍길동 ", "msg")).isEqualTo(" 홍길동 ");
    }

}
