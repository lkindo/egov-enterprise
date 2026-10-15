package nuri.migration.domain;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Objects;

/**
 * 대상 값 한계 가드(ADR-0029 L3b). 변환을 마친 값 하나가 대상 컬럼의 길이·정밀도·NOT NULL 에 들어가는지 쓰기 전에 본다 —
 * 쓰기 단계 오류(SQLSTATE)는 격리하지 않으므로(DEC-OPS-310) 격리할 수 있는 위반은 행 변환 단계에서 코드로 알려야 한다.
 * 실행기는 거부를 {@code DOMAIN_VIOLATION(<코드>)} 로 남긴다. 값은 담지 않는다.
 *
 * <p>대상은 {@code isolate} 를 선언한 컬럼과, 정적 정밀도 판정을 행 단위로 옮긴 컬럼(문자 소스를 {@code type:
 * decimal|numeric} 으로 바꾸는 컬럼)뿐이다. 그 밖의 컬럼은 정적 판정과 쓰기 단계가 그대로 멈춘다.</p>
 *
 * <ul>
 *   <li>{@link Violation#REQUIRED_MISSING} — NULL 인데 대상이 NOT NULL 이다. 매핑한 컬럼은 INSERT 가 NULL 도 명시해
 *       바인딩하므로 기본값 여부와 무관하다.</li>
 *   <li>{@link Violation#LENGTH_EXCEEDED} — 문자 표기의 코드포인트 수가 대상 길이를 넘는다.</li>
 *   <li>{@link Violation#PRECISION_EXCEEDED} — 수의 정수 자릿수·소수 자릿수가 대상을 넘거나 정수 대상에 소수부·범위 밖
 *       값이 온다. PostgreSQL 이 조용히 반올림하는 소수 자릿수 초과도 막는다.</li>
 * </ul>
 */
public final class TargetValueGuard {

    private static final BigInteger[][] INTEGER_RANGES = {
            {BigInteger.valueOf(Byte.MIN_VALUE), BigInteger.valueOf(Byte.MAX_VALUE)},
            {BigInteger.valueOf(Short.MIN_VALUE), BigInteger.valueOf(Short.MAX_VALUE)},
            {BigInteger.valueOf(Integer.MIN_VALUE), BigInteger.valueOf(Integer.MAX_VALUE)},
            {BigInteger.valueOf(Long.MIN_VALUE), BigInteger.valueOf(Long.MAX_VALUE)}};

    /** 가장 넓은 정수 대상(bigint)의 자릿수. 이보다 자릿수가 많은 값은 정수로 펼치지 않고 거부한다. */
    private static final long MAX_INTEGER_DIGITS = 19;

    private TargetValueGuard() {}

    /** 가드가 내는 위반 코드. 원장 승인 예외의 격리 코드와 같은 이름이다. */
    public enum Violation {
        LENGTH_EXCEEDED,
        PRECISION_EXCEEDED,
        REQUIRED_MISSING
    }

    /**
     * 대상 컬럼 하나의 한계 — 물리 컬럼과 표준 도메인 중 좁은 쪽을 합친 값이다. null 은 제한이 없다는 뜻이다.
     * {@code integerRank} 는 정수 대상의 폭(1 tinyint·2 smallint·3 integer·4 bigint)이고, 있으면 소수부를 받지 않는다.
     * {@code integerDigits}·{@code fractionDigits} 는 numeric(p,s) 의 p−s·s 다.
     */
    public record Limit(Long maxCodePoints, Integer integerDigits, Integer fractionDigits, Integer integerRank,
                        boolean required) {

        public Limit {
            if ((maxCodePoints != null && maxCodePoints < 0) || (integerDigits != null && integerDigits < 0)
                    || (fractionDigits != null && fractionDigits < 0)
                    || (integerRank != null && (integerRank < 1 || integerRank > INTEGER_RANGES.length))) {
                throw new IllegalArgumentException("대상 값 한계가 올바르지 않습니다");
            }
        }
    }

    /** 값이 한계 안이면 null, 아니면 위반 코드. 판정할 수 없는 값 종류는 정적 판정이 맡으므로 통과시킨다. */
    public static Violation check(Object value, Limit limit) {
        Objects.requireNonNull(limit, "limit");
        if (value == null) {
            return limit.required() ? Violation.REQUIRED_MISSING : null;
        }
        if (limit.maxCodePoints() != null && lengthOf(value) > limit.maxCodePoints()) {
            return Violation.LENGTH_EXCEEDED;
        }
        if (limit.integerDigits() == null && limit.fractionDigits() == null && limit.integerRank() == null) {
            return null;
        }
        if (!(value instanceof Number number)) {
            return null;
        }
        BigDecimal decimal = decimalOf(number);
        if (decimal == null) {
            return Violation.PRECISION_EXCEEDED;
        }
        long fraction = 0;
        long integer = 0;
        if (decimal.signum() != 0) {
            BigDecimal normalized;
            try {
                normalized = decimal.stripTrailingZeros();
            } catch (ArithmeticException scaleOverflow) {
                // 끝의 0 을 지우면 지수가 int 범위를 넘는다 — 어떤 대상 자릿수에도 들어가지 않는다.
                return Violation.PRECISION_EXCEEDED;
            }
            fraction = Math.max(normalized.scale(), 0);
            integer = Math.max((long) normalized.precision() - normalized.scale(), 0L);
        }
        if (limit.integerRank() != null) {
            // 자릿수로 먼저 거른다 — 1e999999999 같은 값을 정수로 펼치면 메모리를 다 쓰고, 그 오류는 위반 코드가 되지 않는다.
            if (fraction > 0 || integer > MAX_INTEGER_DIGITS) {
                return Violation.PRECISION_EXCEEDED;
            }
            BigInteger[] range = INTEGER_RANGES[limit.integerRank() - 1];
            BigInteger whole = decimal.toBigInteger();
            if (whole.compareTo(range[0]) < 0 || whole.compareTo(range[1]) > 0) {
                return Violation.PRECISION_EXCEEDED;
            }
        }
        if ((limit.fractionDigits() != null && fraction > limit.fractionDigits())
                || (limit.integerDigits() != null && integer > limit.integerDigits())) {
            return Violation.PRECISION_EXCEEDED;
        }
        return null;
    }

    /**
     * 문자 대상에 쓰이는 표기의 코드포인트 수. 문자·문자 하나·수만 판정하고 나머지 값 종류는 -1 이다. 십진수는 표기를
     * 만들지 않고 자릿수로 센다({@link #plainLength}).
     */
    private static long lengthOf(Object value) {
        if (value instanceof CharSequence text) {
            return Character.codePointCount(text, 0, text.length());
        }
        if (value instanceof Character) {
            return 1;
        }
        if (value instanceof BigDecimal decimal) {
            return plainLength(decimal);
        }
        if (value instanceof Number) {
            String text = value.toString();
            return text.codePointCount(0, text.length());
        }
        return -1;
    }

    /**
     * {@link BigDecimal#toPlainString()} 의 길이를 표기를 만들지 않고 센다 — {@code 1e999999999} 를 펼치면 메모리를 다 쓰고,
     * 그 오류는 위반 코드가 되지 않는다. 부호·정수부(없으면 0 한 자리)·소수점과 소수 자릿수다.
     */
    static long plainLength(BigDecimal decimal) {
        long scale = decimal.scale();
        if (decimal.signum() == 0) {
            return scale > 0 ? scale + 2 : 1;
        }
        long sign = decimal.signum() < 0 ? 1 : 0;
        long integer = Math.max(decimal.precision() - scale, 1L);
        return sign + integer + (scale > 0 ? scale + 1 : 0);
    }

    /** 수를 정확한 십진수로 읽는다. 유한하지 않은 부동소수는 어떤 정밀도에도 들어가지 않으므로 null 이다. */
    private static BigDecimal decimalOf(Number number) {
        if (number instanceof BigDecimal decimal) {
            return decimal;
        }
        if (number instanceof BigInteger integer) {
            return new BigDecimal(integer);
        }
        if (number instanceof Double || number instanceof Float) {
            double value = number.doubleValue();
            return Double.isFinite(value) ? new BigDecimal(number.toString()) : null;
        }
        return BigDecimal.valueOf(number.longValue());
    }
}
