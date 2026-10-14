package nuri.migration.validate;

import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.validate.TargetValueDomain.Family;

/**
 * 타깃이 받아들이는 값의 한계 — live 물리 컬럼 또는 표준 도메인 하나.
 *
 * <p>{@code maxChars} 가 null 이면 문자 길이 제한이 없고, {@code intDigits} 가 null 이면 수치 정밀도 제한이 없다.
 * 정수 타입은 순위({@code integerRank}: smallint 2, integer 3, bigint 4)와 함께, 소수 값이 언제나
 * 들어갈 수 있는 안전 자릿수(4·9·18)를 {@code intDigits} 로 둔다.
 */
record TargetLimit(Family family, Long maxChars, Integer integerRank, Integer intDigits, Integer scale) {

    static TargetLimit of(Family family) {
        return new TargetLimit(family, null, null, null, null);
    }

    static TargetLimit text(Long maxChars) {
        return new TargetLimit(Family.TEXT, maxChars, null, null, null);
    }

    static TargetLimit integer(int rank) {
        return new TargetLimit(Family.INTEGER, null, rank, TargetValueDomain.safeDigits(rank), 0);
    }

    static TargetLimit decimal(Integer intDigits, Integer scale) {
        return new TargetLimit(Family.DECIMAL, null, null, intDigits, scale);
    }

    /** information_schema.columns 의 data_type 으로 한계를 정한다. 모르는 타입은 OTHER 다. */
    static TargetLimit physical(ColumnContract column) {
        return switch (column.dataType()) {
            case "character varying", "character" -> text(column.characterMaximumLength() == null
                    ? null : column.characterMaximumLength().longValue());
            case "text" -> text(null);
            case "smallint" -> integer(2);
            case "integer" -> integer(3);
            case "bigint" -> integer(4);
            case "numeric" -> column.numericPrecision() == null
                    ? decimal(null, null)
                    : decimal(column.numericPrecision() - scaleOf(column), scaleOf(column));
            case "real", "double precision" -> of(Family.APPROXIMATE);
            case "boolean" -> of(Family.BOOLEAN);
            case "date" -> of(Family.DATE);
            case "time without time zone" -> of(Family.TIME);
            case "time with time zone" -> of(Family.TIMETZ);
            case "timestamp without time zone" -> of(Family.TIMESTAMP);
            case "timestamp with time zone" -> of(Family.TIMESTAMPTZ);
            case "bytea" -> of(Family.BINARY);
            case "uuid" -> of(Family.UUID);
            default -> of(Family.OTHER);
        };
    }

    private static int scaleOf(ColumnContract column) {
        return column.numericScale() == null ? 0 : column.numericScale();
    }

    boolean isExactNumeric() {
        return family == Family.INTEGER || family == Family.DECIMAL;
    }

    /** 표준 도메인(this)과 물리 컬럼이 같은 종류의 값을 담는가. */
    boolean sameKind(TargetLimit physical) {
        return switch (family) {
            case INTEGER, DECIMAL -> physical.isExactNumeric();
            case TIMESTAMP -> physical.family == Family.TIMESTAMP || physical.family == Family.TIMESTAMPTZ;
            default -> physical.family == family;
        };
    }
}
