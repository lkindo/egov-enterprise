package nuri.foundation.core.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("검증 유틸리티(ValidationUtils) 테스트")
class ValidationUtilsTest {

    @Test
    @DisplayName("null 검증")
    void required() {
        String val = "ok";
        assertThat(ValidationUtils.required(val)).isEqualTo(val);
        assertThat(ValidationUtils.required(val, "msg")).isEqualTo(val);
        assertThat(ValidationUtils.required(() -> val, "msg")).isEqualTo(val);

        assertThatThrownBy(() -> ValidationUtils.required(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("문자열 빈값 검증")
    void notBlank() {
        String val = "text";
        assertThat(ValidationUtils.notBlank(val)).isEqualTo(val);
        assertThat(ValidationUtils.notBlank(val, "msg")).isEqualTo(val);

        assertThatThrownBy(() -> ValidationUtils.notBlank(""))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notBlank("  "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notBlank(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("컬렉션 빈값 검증")
    void notEmpty() {
        List<String> list = Arrays.asList("a");
        assertThat(ValidationUtils.notEmpty(list)).isEqualTo(list);
        assertThat(ValidationUtils.notEmpty(list, "msg")).isEqualTo(list);

        assertThatThrownBy(() -> ValidationUtils.notEmpty(Collections.emptyList()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notEmpty((java.util.Collection<?>) null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("조건 검증")
    void conditions() {
        ValidationUtils.isTrue(true, "msg");
        ValidationUtils.isFalse(false, "msg");

        assertThatThrownBy(() -> ValidationUtils.isTrue(false, "msg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.isFalse(true, "msg"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
