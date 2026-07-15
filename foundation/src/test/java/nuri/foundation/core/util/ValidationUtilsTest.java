package nuri.foundation.core.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

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
    @DisplayName("required(Supplier<T> supplier, String message) - 성공")
    void required_supplier_success() {
        assertThat(ValidationUtils.required(() -> "test", "error")).isEqualTo("test");
    }

    @Test
    @DisplayName("required(Supplier<T> supplier, String message) - null 반환 시 예외 발생")
    void required_supplier_null() {
        assertThatThrownBy(() -> ValidationUtils.required(() -> null, "error message"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("error message");
    }

    @Test
    @DisplayName("required(T value, Function<T, R> mapper) - 성공")
    void required_mapper_success() {
        Integer result = ValidationUtils.required("10", Integer::parseInt);
        assertThat(result).isEqualTo(10);
    }

    @Test
    @DisplayName("required(T value, Function<T, R> mapper) - null인 경우 예외 발생")
    void required_mapper_null() {
        assertThatThrownBy(() -> ValidationUtils.required(null, obj -> obj.toString()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("값은 null 일 수 없습니다");
    }

    @Test
    @DisplayName("isTrue - 성공")
    void isTrue_success() {
        ValidationUtils.isTrue(true, "error");
    }

    @Test
    @DisplayName("isTrue - 실패 시 예외 발생")
    void isTrue_fail() {
        assertThatThrownBy(() -> ValidationUtils.isTrue(false, "condition failed"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("condition failed");
    }

    @Test
    @DisplayName("isFalse - 성공")
    void isFalse_success() {
        ValidationUtils.isFalse(false, "error");
    }

    @Test
    @DisplayName("isFalse - 실패 시 예외 발생")
    void isFalse_fail() {
        assertThatThrownBy(() -> ValidationUtils.isFalse(true, "condition failed"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("condition failed");
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

    @Test
    @DisplayName("notEmpty(Collection) - 성공")
    void notEmpty_collection_success() {
        List<String> list = List.of("a");
        assertThat(ValidationUtils.notEmpty(list)).isEqualTo(list);
    }

    @Test
    @DisplayName("notEmpty(Collection) - null 또는 빈 컬렉션 시 예외 발생")
    void notEmpty_collection_fail() {
        assertThatThrownBy(() -> ValidationUtils.notEmpty((Collection<?>) null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notEmpty(Collections.emptyList()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("notEmpty(Collection, String) - 커스텀 메시지")
    void notEmpty_collection_message_fail() {
        assertThatThrownBy(() -> ValidationUtils.notEmpty(null, "collection error"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("collection error");
    }

    @Test
    @DisplayName("notEmpty(T[]) - 성공")
    void notEmpty_array_success() {
        String[] array = {"a"};
        assertThat(ValidationUtils.notEmpty(array)).isEqualTo(array);
    }

    @Test
    @DisplayName("notEmpty(T[]) - null 또는 빈 배열 시 예외 발생")
    void notEmpty_array_fail() {
        assertThatThrownBy(() -> ValidationUtils.notEmpty((Object[]) null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.notEmpty(new Object[0]))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("isPositive - 성공")
    void isPositive_success() {
        ValidationUtils.isPositive(1, "error");
        ValidationUtils.isPositive(10L, "error");
        ValidationUtils.isPositive(0.1, "error");
    }

    @Test
    @DisplayName("isPositive - 0 이하 또는 null 시 예외 발생")
    void isPositive_fail() {
        assertThatThrownBy(() -> ValidationUtils.isPositive(0, "not positive"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("not positive");
        assertThatThrownBy(() -> ValidationUtils.isPositive(-1, "not positive"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValidationUtils.isPositive(null, "not positive"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("validIndex - 성공")
    void validIndex_success() {
        assertThat(ValidationUtils.validIndex(0, 1)).isEqualTo(0);
        assertThat(ValidationUtils.validIndex(5, 10)).isEqualTo(5);
    }

    @Test
    @DisplayName("validIndex - 범위 밖일 때 예외 발생")
    void validIndex_fail() {
        assertThatThrownBy(() -> ValidationUtils.validIndex(-1, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("범위를 벗어났습니다");
        assertThatThrownBy(() -> ValidationUtils.validIndex(10, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("범위를 벗어났습니다");
    }
}
