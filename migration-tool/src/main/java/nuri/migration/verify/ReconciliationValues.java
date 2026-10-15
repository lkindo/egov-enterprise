package nuri.migration.verify;

import nuri.migration.state.RowChecksum;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * [ADR-0029 L4 D2] 대사가 값을 비교하는 정규형. 원천 집계·대상 누적·표본 비교가 같은 규칙을 쓴다.
 *
 * <p>정확 수치는 정수·{@link BigDecimal} 만 받는다 — 부동소수는 합이 정확하지 않아 null(판정하지 않음)이다. 시간 값은
 * 시간대 없는 {@link LocalDate}·{@link LocalDateTime} 으로 맞춘다. 표본·코드 비교는 체크섬과 같은 정규형
 * ({@link RowChecksum#canonicalValue})이라, 체크섬이 같다고 보는 두 값을 다르다고 하지 않는다.</p>
 */
public final class ReconciliationValues {

    private ReconciliationValues() {
    }

    /** 정수·{@link BigInteger}·{@link BigDecimal} 이면 그 값, 아니면 null. */
    public static BigDecimal decimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof BigInteger integer) {
            return new BigDecimal(integer);
        }
        if (value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte) {
            return BigDecimal.valueOf(((Number) value).longValue());
        }
        return null;
    }

    /** JDBC 날짜·일시나 시간대 없는 java.time 값이면 {@link LocalDate}·{@link LocalDateTime}, 아니면 null. */
    public static Object temporal(Object value) {
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate || value instanceof LocalDateTime) {
            return value;
        }
        return null;
    }

    /** 체크섬과 같은 정규형. */
    public static String canonical(Object value) {
        return RowChecksum.canonicalValue(value);
    }

    /**
     * COUNT 결과를 행 수로 읽는다. 정수로 읽을 수 없으면 값을 싣지 않는 고정 문구로 실패한다 — 집계 문장 실패와 같이
     * 원천 집계를 쓸 수 없다는 뜻이다.
     */
    public static long count(Object value) {
        BigDecimal decimal = decimal(value);
        if (decimal == null || decimal.signum() < 0) {
            throw new IllegalStateException("SOURCE_AGGREGATE_UNREADABLE");
        }
        try {
            return decimal.longValueExact();
        } catch (ArithmeticException notIntegral) {
            throw new IllegalStateException("SOURCE_AGGREGATE_UNREADABLE");
        }
    }

    /** 두 시간 값이 같은 종류인가. 하나라도 null 이면 참이다. */
    static boolean sameTemporalKind(Object left, Object right) {
        return left == null || right == null || left.getClass() == right.getClass();
    }
}
