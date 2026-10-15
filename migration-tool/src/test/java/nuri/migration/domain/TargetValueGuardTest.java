package nuri.migration.domain;

import nuri.migration.domain.TargetValueGuard.Limit;
import nuri.migration.domain.TargetValueGuard.Violation;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Duration;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

/**
 * 대상 값 한계 가드(ADR-0029 L3b). 쓰기 단계가 SQLSTATE 로 멈추거나 PostgreSQL 이 조용히 반올림할 값을 행 변환 단계의
 * 위반 코드로 먼저 알리는지 본다. 경계 값을 양쪽에서 단언한다.
 */
class TargetValueGuardTest {

    private static final Limit VARCHAR8 = new Limit(8L, null, null, null, false);
    private static final Limit NUMERIC_5_2 = new Limit(null, 3, 2, null, false);
    private static final Limit REQUIRED_TEXT = new Limit(null, null, null, null, true);

    @Test
    void lengthCountsCodePointsNotUtf16Units() {
        assertThat(TargetValueGuard.check("12345678", VARCHAR8)).isNull();
        assertThat(TargetValueGuard.check("123456789", VARCHAR8)).isEqualTo(Violation.LENGTH_EXCEEDED);
        // 보충 평면 문자는 UTF-16 두 칸이지만 PostgreSQL 은 한 글자로 센다.
        assertThat(TargetValueGuard.check("가나다라마바사😀", VARCHAR8)).isNull();
        assertThat(TargetValueGuard.check("가나다라마바사😀😀", VARCHAR8)).isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check(new StringBuilder("123456789"), VARCHAR8))
                .isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check('x', new Limit(0L, null, null, null, false)))
                .isEqualTo(Violation.LENGTH_EXCEEDED);
    }

    @Test
    void numbersWrittenIntoTextAreMeasuredByTheirPlainSpelling() {
        assertThat(TargetValueGuard.check(new BigDecimal("1E+7"), VARCHAR8)).as("10000000 은 8자").isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("1E+8"), VARCHAR8)).isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check(123456789L, VARCHAR8)).isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check(LocalDate.of(2024, 1, 31), new Limit(4L, null, null, null, false)))
                .as("수·문자가 아닌 값의 길이는 정적 판정이 맡는다").isNull();
    }

    @Test
    void theCountedLengthOfADecimalIsExactlyItsPlainSpellingOnBothSidesOfTheLimit() {
        for (String spelling : new String[] {"0", "0.00", "0E+3", "0E-3", "7", "-7", "12.34", "-12.34", "0.05",
                "-0.005", "1E+7", "-1E+7", "123E-1", "9.990"}) {
            BigDecimal decimal = new BigDecimal(spelling);
            long length = decimal.toPlainString().length();

            assertThat(TargetValueGuard.check(decimal, new Limit(length, null, null, null, false))).as(spelling)
                    .isNull();
            assertThat(TargetValueGuard.check(decimal, new Limit(length - 1, null, null, null, false))).as(spelling)
                    .isEqualTo(Violation.LENGTH_EXCEEDED);
        }
    }

    @Test
    void hugeExponentsAreRejectedByTheirDigitCountWithoutBeingExpanded() {
        // 문자 소스를 type: decimal 로 읽으면 '1e99999999' 는 지수만 큰 십진수다 — 정수로 펼치면 1억 자리를 몇 분 동안
        //   만들고, 지수가 더 크면 BigInteger 범위를 넘고, 표기는 Java 문자열 한계를 넘는다. 어느 쪽도 위반 코드가 아니다.
        BigDecimal slow = new BigDecimal("1e99999999");
        Limit bigint = new Limit(null, null, null, 4, false);

        assertThat(assertTimeoutPreemptively(Duration.ofSeconds(10), () -> TargetValueGuard.check(slow, bigint)))
                .as("정수 대상은 정수로 펼치기 전에 자릿수로 거른다").isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("1e999999999"), bigint))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("1e2147483647"), VARCHAR8))
                .as("문자 대상은 표기를 만들지 않고 길이를 센다").isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("0e-2147483647"), VARCHAR8))
                .isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(assertTimeoutPreemptively(Duration.ofSeconds(10), () -> TargetValueGuard.check(slow, VARCHAR8)))
                .isEqualTo(Violation.LENGTH_EXCEEDED);
        assertThat(TargetValueGuard.check(slow, NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("100e2147483647"), NUMERIC_5_2))
                .as("끝의 0 을 지우면 지수가 int 를 넘는 값도 위반 코드다").isEqualTo(Violation.PRECISION_EXCEEDED);
    }

    @Test
    void fractionDigitsBeyondTheScaleAreRejectedWhereTheDatabaseWouldRoundSilently() {
        assertThat(TargetValueGuard.check(new BigDecimal("123.45"), NUMERIC_5_2)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("123.456"), NUMERIC_5_2))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("123.450"), NUMERIC_5_2)).as("끝의 0 은 자릿수가 아니다")
                .isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("0.001"), NUMERIC_5_2))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("999.995"), NUMERIC_5_2))
                .as("반올림하면 넘치는 값도 소수 자릿수에서 멈춘다").isEqualTo(Violation.PRECISION_EXCEEDED);
    }

    @Test
    void integerDigitsBeyondPrecisionMinusScaleAreRejected() {
        assertThat(TargetValueGuard.check(new BigDecimal("999.99"), NUMERIC_5_2)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("1000"), NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("-999.99"), NUMERIC_5_2)).as("부호는 자릿수가 아니다").isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("1E+3"), NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(1000, NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(BigInteger.valueOf(999), NUMERIC_5_2)).isNull();
    }

    @Test
    void zeroFitsAPureFractionColumn() {
        Limit fraction = new Limit(null, 0, 2, null, false);

        assertThat(TargetValueGuard.check(BigDecimal.ZERO, fraction)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("0.00"), fraction)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("0.99"), fraction)).isNull();
        assertThat(TargetValueGuard.check(BigDecimal.ONE, fraction)).isEqualTo(Violation.PRECISION_EXCEEDED);
    }

    @Test
    void integerTargetsTakeOnlyWholeValuesInsideTheirRange() {
        Limit integer = new Limit(null, null, null, 3, false);
        Limit smallint = new Limit(null, null, null, 2, false);

        assertThat(TargetValueGuard.check(new BigDecimal("2147483647"), integer)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("2147483648"), integer))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(new BigDecimal("-2147483648"), integer)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("12.0"), integer)).as("소수부가 0 이면 정수다").isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("12.5"), integer))
                .as("정수 컬럼은 소수부를 조용히 반올림한다").isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(32768, smallint)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(-32768, smallint)).isNull();
        assertThat(TargetValueGuard.check(Long.MAX_VALUE, new Limit(null, null, null, 4, false))).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("9223372036854775808"), new Limit(null, null, null, 4, false)))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
    }

    @Test
    void floatingValuesAreJudgedByTheirDecimalSpellingAndNonFiniteNeverFits() {
        assertThat(TargetValueGuard.check(1.5d, NUMERIC_5_2)).isNull();
        assertThat(TargetValueGuard.check(1.555d, NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(Double.NaN, NUMERIC_5_2)).isEqualTo(Violation.PRECISION_EXCEEDED);
        assertThat(TargetValueGuard.check(Float.POSITIVE_INFINITY, NUMERIC_5_2))
                .isEqualTo(Violation.PRECISION_EXCEEDED);
    }

    @Test
    void nullIntoANotNullColumnIsMissingWhateverTheDefault() {
        assertThat(TargetValueGuard.check(null, REQUIRED_TEXT)).isEqualTo(Violation.REQUIRED_MISSING);
        assertThat(TargetValueGuard.check(null, new Limit(1L, 1, 0, 2, true))).isEqualTo(Violation.REQUIRED_MISSING);
        assertThat(TargetValueGuard.check(null, VARCHAR8)).isNull();
        assertThat(TargetValueGuard.check("", REQUIRED_TEXT)).as("빈 문자는 NULL 이 아니다").isNull();
    }

    @Test
    void textValuesArePassedToTheStaticJudgementForNumericLimits() {
        assertThat(TargetValueGuard.check("123.456", NUMERIC_5_2)).isNull();
        assertThat(TargetValueGuard.check(new BigDecimal("12.34"), new Limit(null, null, null, null, false))).isNull();
    }

    @Test
    void limitsMustBeWellFormed() {
        assertThatThrownBy(() -> new Limit(-1L, null, null, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Limit(null, -1, null, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Limit(null, null, -1, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Limit(null, null, null, 0, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Limit(null, null, null, 5, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TargetValueGuard.check("x", null)).isInstanceOf(NullPointerException.class);
    }
}
