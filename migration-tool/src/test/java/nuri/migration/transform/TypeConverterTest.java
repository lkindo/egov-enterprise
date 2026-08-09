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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 TypeConverter 에서 10개를 살려 보냈다.
    //   이 클래스는 **데이터 마이그레이션의 타입 변환기**다 — 값이 잘못 변환되면
    //   예외가 아니라 **조용한 데이터 손상**으로 끝난다. 경계 조건이 곧 데이터 무결성이다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void 빈문자열은_문자타입이면_보존되고_그외_타입이면_null이_된다() {
        // 문자 계열 4종: 빈 문자열이 그대로 살아야 한다.
        for (String t : new String[] { "string", "varchar", "text", "char" }) {
            assertThat(TypeConverter.convert(t, "")).as(t + " 는 빈 문자열을 보존한다").isEqualTo("");
            assertThat(TypeConverter.convert(t, "   ")).as(t + " 는 공백을 보존한다").isEqualTo("   ");
        }
        // 비문자 타입: 빈 문자열/공백은 NULL(레거시 공백 관용).
        // 조건을 뒤집은 뮤턴트는 여기서 Integer.valueOf("") 를 시도해 죽는다.
        assertThat(TypeConverter.convert("int", "")).isNull();
        assertThat(TypeConverter.convert("long", "   ")).isNull();
        assertThat(TypeConverter.convert("decimal", "")).isNull();
        assertThat(TypeConverter.convert("date", "  ")).isNull();
    }

    @Test
    void type이_비었거나_value가_null이면_원본을_그대로_돌려준다() {
        assertThat(TypeConverter.convert(null, "abc")).isEqualTo("abc");
        assertThat(TypeConverter.convert("", "abc")).isEqualTo("abc");
        assertThat(TypeConverter.convert("   ", "abc")).isEqualTo("abc");
        assertThat(TypeConverter.convert("int", null)).isNull();
    }

    @Test
    void stripDecimal_은_소수점_이하를_버린다_경계포함() {
        // dot < 0 경계: 소수점이 없으면 원본 그대로.
        assertThat(TypeConverter.convert("int", "12")).isEqualTo(12);
        // 소수점이 있으면 앞부분만.
        assertThat(TypeConverter.convert("int", "12.0")).isEqualTo(12);
        assertThat(TypeConverter.convert("int", "12.987")).isEqualTo(12);
        // 소수점이 0번 인덱스인 경계 — `dot < 0` 을 `dot <= 0` 으로 바꾼 뮤턴트가 여기서 죽는다.
        // ".5" 는 앞부분이 빈 문자열이 되어 NumberFormatException 이다.
        assertThatThrownBy(() -> TypeConverter.convert("int", ".5"))
                .isInstanceOf(NumberFormatException.class);
        assertThat(TypeConverter.convert("long", "9007199254740993.0")).isEqualTo(9007199254740993L);
    }

    @Test
    void parseDate_는_YYYYMMDD_8자리와_ISO를_모두_받는다() {
        // 8자리 전부 숫자 → YYYY-MM-DD 로 재조립.
        assertThat(TypeConverter.convert("date", "20260809")).isEqualTo(LocalDate.of(2026, 8, 9));
        // ISO 그대로.
        assertThat(TypeConverter.convert("date", "2026-08-09")).isEqualTo(LocalDate.of(2026, 8, 9));
        // 10자 초과 → 앞 10자만 사용(타임스탬프 문자열이 date 컬럼에 온 경우).
        assertThat(TypeConverter.convert("date", "2026-08-09 13:45:00")).isEqualTo(LocalDate.of(2026, 8, 9));
        // 길이는 8인데 숫자가 아니면 재조립 경로가 아니다 — 조건을 뒤집은 뮤턴트가 여기서 죽는다.
        assertThatThrownBy(() -> TypeConverter.convert("date", "2026/8/9"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void parseTimestamp_는_공백구분과_T구분을_모두_받는다() {
        LocalDateTime expected = LocalDateTime.of(2026, 8, 9, 13, 45, 0);
        assertThat(TypeConverter.convert("timestamp", "2026-08-09T13:45:00")).isEqualTo(expected);
        assertThat(TypeConverter.convert("timestamp", "2026-08-09 13:45:00")).isEqualTo(expected);
        assertThat(TypeConverter.convert("datetime", "2026-08-09 13:45:00")).isEqualTo(expected);
        // `replaced return value with null` 뮤턴트는 위 단언에서 죽는다.
    }
}
