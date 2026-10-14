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
    void binaryAndJdbcLocatorsCannotBecomeObjectIdentityStrings() {
        byte[] bytes = {0, 1, -1};
        assertThat(TypeConverter.convert(null, bytes)).isSameAs(bytes);
        for (String type : new String[] {"text", "string", "int", "uuid"}) {
            assertThatThrownBy(() -> TypeConverter.convert(type, bytes))
                    .isInstanceOf(IllegalArgumentException.class).hasNoCause();
        }
        for (Object locator : new Object[] {org.mockito.Mockito.mock(java.sql.Blob.class),
                org.mockito.Mockito.mock(java.sql.Clob.class)}) {
            assertThatThrownBy(() -> TypeConverter.convert(null, locator))
                    .isInstanceOf(IllegalArgumentException.class).hasNoCause();
        }
    }

    @Test
    void aTextTypeRejectsObjectsWhoseStringFormIsNotTheValue() {
        // 원장은 문자 type 을 추정기가 판정하지 못한 값 종류의 행 단위 판정으로 센다(ADR-0029 L3a-2).
        for (Object notText : new Object[] {org.mockito.Mockito.mock(java.sql.SQLXML.class),
                org.mockito.Mockito.mock(java.sql.Struct.class), org.mockito.Mockito.mock(java.sql.Array.class),
                org.mockito.Mockito.mock(java.sql.Ref.class), org.mockito.Mockito.mock(java.sql.RowId.class),
                new java.io.ByteArrayInputStream(new byte[] {1}), new java.io.StringReader("x")}) {
            for (String type : new String[] {"text", "string", "varchar", "char"}) {
                assertThatThrownBy(() -> TypeConverter.convert(type, notText)).as(type + " ← " + notText.getClass())
                        .isInstanceOf(IllegalArgumentException.class).hasNoCause();
            }
        }
        // 문자로 읽은 LOB(문자열)·숫자·날짜·논리값은 그대로 문자로 받는다.
        assertThat(TypeConverter.convert("text", "CLOB 본문")).isEqualTo("CLOB 본문");
        assertThat(TypeConverter.convert("varchar", 12)).isEqualTo("12");
        assertThat(TypeConverter.convert("string", LocalDate.of(2026, 10, 15))).isEqualTo("2026-10-15");
        assertThat(TypeConverter.convert("char", Boolean.TRUE)).isEqualTo("true");
    }

    @Test
    void nullAndBlankPassThroughButUnknownTypeFailsClosed() {
        assertThat(TypeConverter.convert("int", null)).isNull();
        assertThat(TypeConverter.convert(null, "x")).isEqualTo("x");
        assertThat(TypeConverter.convert("", "x")).isEqualTo("x");
        assertThatThrownBy(() -> TypeConverter.convert("weirdtype", "sentinel-value"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel-value");
    }

    @Test
    void numericTypes() {
        assertThat(TypeConverter.convert("int", "42")).isEqualTo(42);
        assertThat(TypeConverter.convert("int", "42.0")).isEqualTo(42); // exact integral decimal
        assertThat(TypeConverter.convert("long", "123456789012")).isEqualTo(123456789012L);
        assertThat(TypeConverter.convert("decimal", "12.34")).isEqualTo(new BigDecimal("12.34"));
        assertThat(TypeConverter.convert("int", " 7 ")).isEqualTo(7); // trim
        assertThatThrownBy(() -> TypeConverter.convert("int", "42.5"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("int", "2147483648"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("long", "9223372036854775808"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("double", "NaN"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("double", "Infinity"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
    }

    @Test
    void booleanFlags() {
        assertThat(TypeConverter.convert("boolean", "Y")).isEqualTo(Boolean.TRUE);
        assertThat(TypeConverter.convert("boolean", "N")).isEqualTo(Boolean.FALSE);
        assertThat(TypeConverter.convert("boolean", "1")).isEqualTo(Boolean.TRUE);
        assertThat(TypeConverter.convert("bool", "false")).isEqualTo(Boolean.FALSE);
        assertThatThrownBy(() -> TypeConverter.convert("boolean", "sentinel-flag"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel-flag");
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

    /** [ADR-0029 L3a-1] 실행기는 이 판정으로 비문자 type 의 공백을 변환 전에 BLANK 위반으로 멈춘다. */
    @Test
    void nonTextTypesAreTheKnownTypesOtherThanTheFourTextTypes() {
        for (String type : new String[] {"int", "Integer", "long", "bigint", "decimal", "numeric", "double",
                "boolean", "bool", "date", "TIMESTAMP", "datetime", "uuid"}) {
            assertThat(TypeConverter.isNonTextType(type)).as(type).isTrue();
        }
        for (String type : new String[] {"string", "varchar", "TEXT", "char", "nope", " ", null}) {
            assertThat(TypeConverter.isNonTextType(type)).as(String.valueOf(type)).isFalse();
        }
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
    void integerConversionAcceptsOnlyExactIntegralValuesAndRejectsLoss() {
        assertThat(TypeConverter.convert("int", "12")).isEqualTo(12);
        assertThat(TypeConverter.convert("int", "12.0")).isEqualTo(12);
        assertThatThrownBy(() -> TypeConverter.convert("int", "12.987"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("int", ".5"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThat(TypeConverter.convert("long", "9007199254740993.0")).isEqualTo(9007199254740993L);
    }

    @Test
    void parseDate_는_YYYYMMDD_8자리와_ISO를_모두_받는다() {
        // 8자리 전부 숫자 → YYYY-MM-DD 로 재조립.
        assertThat(TypeConverter.convert("date", "20260809")).isEqualTo(LocalDate.of(2026, 8, 9));
        // ISO 그대로.
        assertThat(TypeConverter.convert("date", "2026-08-09")).isEqualTo(LocalDate.of(2026, 8, 9));
        // timestamp가 date 컬럼으로 오면 전체 timestamp를 검증한 뒤, 자정일 때만 date를 취한다.
        assertThat(TypeConverter.convert("date", "2026-08-09 00:00:00")).isEqualTo(LocalDate.of(2026, 8, 9));
        assertThat(TypeConverter.convert("date", "2026-08-09T00:00")).isEqualTo(LocalDate.of(2026, 8, 9));
        // [2026-10-13 DEC-OPS-309] 자정이 아닌 시각은 조용히 버리지 않는다(종전: 13:45 를 버리고 날짜만).
        for (String withTime : new String[] {"2026-08-09 13:45:00", "2026-08-09 00:00:01", "2026-08-09T00:00:00.000001"}) {
            assertThatThrownBy(() -> TypeConverter.convert("date", withTime))
                    .as(withTime)
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasNoCause()
                    .hasMessageNotContaining("2026");
        }
        // JDBC 가 Timestamp·LocalDateTime 으로 주는 값도 같다(Oracle DATE 는 시각을 담는다).
        assertThat(TypeConverter.convert("date", java.sql.Timestamp.valueOf("2026-08-09 00:00:00")))
                .isEqualTo(LocalDate.of(2026, 8, 9));
        assertThatThrownBy(() -> TypeConverter.convert("date", LocalDateTime.of(2026, 8, 9, 13, 45)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("date", "2026/8/9"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
        assertThatThrownBy(() -> TypeConverter.convert("date", "2026-08-09-not-a-time"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasNoCause();
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
