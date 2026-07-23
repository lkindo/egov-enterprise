package nuri.migration.transform;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** DSL type 힌트 → 실제 타입 강제(활성화된 죽은 DSL) 검증. */
class TypeConverterTest {

    @Test
    void nullAndUnknownAndBlankPassThrough() {
        assertThat(TypeConverter.convert("int", null)).isNull();
        assertThat(TypeConverter.convert(null, "x")).isEqualTo("x");
        assertThat(TypeConverter.convert("", "x")).isEqualTo("x");
        assertThat(TypeConverter.convert("weirdtype", "x")).isEqualTo("x"); // 미지 → 원본
    }

    @Test
    void numericTypes() {
        assertThat(TypeConverter.convert("int", "42")).isEqualTo(42);
        assertThat(TypeConverter.convert("int", "42.0")).isEqualTo(42); // 소수부 절단
        assertThat(TypeConverter.convert("long", "123456789012")).isEqualTo(123456789012L);
        assertThat(TypeConverter.convert("decimal", "12.34")).isEqualTo(new BigDecimal("12.34"));
        assertThat(TypeConverter.convert("int", " 7 ")).isEqualTo(7); // trim
    }

    @Test
    void booleanFlags() {
        assertThat(TypeConverter.convert("boolean", "Y")).isEqualTo(Boolean.TRUE);
        assertThat(TypeConverter.convert("boolean", "N")).isEqualTo(Boolean.FALSE);
        assertThat(TypeConverter.convert("boolean", "1")).isEqualTo(Boolean.TRUE);
        assertThat(TypeConverter.convert("bool", "false")).isEqualTo(Boolean.FALSE);
        assertThatThrownBy(() -> TypeConverter.convert("boolean", "maybe"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void temporalTypes() {
        assertThat(TypeConverter.convert("date", "20200102")).isEqualTo(LocalDate.of(2020, 1, 2)); // YYYYMMDD
        assertThat(TypeConverter.convert("date", "2020-01-02")).isEqualTo(LocalDate.of(2020, 1, 2));
        assertThat(TypeConverter.convert("timestamp", "2020-01-02 03:04:05"))
                .isEqualTo(LocalDateTime.of(2020, 1, 2, 3, 4, 5));
        assertThat(TypeConverter.convert("timestamp", "2020-01-02T03:04:05"))
                .isEqualTo(LocalDateTime.of(2020, 1, 2, 3, 4, 5));
    }

    @Test
    void knownSetGuardsValidator() {
        assertThat(TypeConverter.isKnown("uuid")).isTrue();
        assertThat(TypeConverter.isKnown("timestamp")).isTrue();
        assertThat(TypeConverter.isKnown("nope")).isFalse();
        assertThat(TypeConverter.isKnown(null)).isFalse();
    }
}
