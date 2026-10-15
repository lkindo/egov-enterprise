package nuri.migration.verify;

import nuri.migration.source.SourceIntrospector;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ColumnCheck.SourceColumnType;

import java.math.BigDecimal;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2] (소스, where) 묶음 하나의 원천 집계 문장. 실행기가 본 읽기와 같은 원천 세션에서 한 번 보낸다.
 *
 * <p>{@link #sql()} 은 {@code COUNT(*)}, NULL 계정 컬럼의 {@code COUNT(c)}, 정확 수치의 {@code SUM}·{@code MIN}·{@code MAX},
 * 시간 컬럼의 {@code MIN}·{@code MAX} 를 한 문장으로 잰다. 합은 넘침을 피하려고 정수는 {@code DECIMAL(38,0)}, 정밀도가 정해진
 * 소수는 {@code DECIMAL(38,s)} 로 바꿔 더하고, 정밀도가 없는 수(Oracle {@code NUMBER} 등)는 그대로 더한다. 이 문장이 실패하면
 * 실행기는 {@link #countOnlySql()} 로 물러나고, 합·최소·최대는 {@link CoverageReason#SOURCE_AGGREGATE_FAILED} 다. 두 문장의
 * COUNT 위치는 같다. 식별자는 {@link SourceIntrospector} 로 검증하고 값을 바인딩하지 않는다.</p>
 *
 * <p>컬럼은 소문자 이름으로 하나로 합치지만(본 읽기의 SELECT 와 같다) 문장에는 mapping 에 적힌 철자를 쓴다 — SQL Server 의
 * 대소문자를 가리는 정렬처럼 따옴표 없는 이름도 대소문자를 가리는 원천이 있다. SQL Server 원천은 {@code COUNT} 가
 * {@code int} 라 21억 행을 넘으면 넘치므로 {@code COUNT_BIG} 을 쓴다({@link #sql(boolean)}).</p>
 */
public final class SourceAggregateQuery {

    private final String source;
    private final String where;
    private final List<AggregateColumn> columns;

    private SourceAggregateQuery(String source, String where, List<AggregateColumn> columns) {
        this.source = source;
        this.where = where;
        this.columns = columns;
    }

    /** 한 묶음의 집계 컬럼. 같은 컬럼을 여러 매핑이 쓰면 하나로 합친다(NULL 계정은 하나라도, 집계는 수치·시간 우선). */
    public static SourceAggregateQuery of(String source, String where, List<AggregateColumn> columns) {
        SourceIntrospector.qualifiedIdent(source);
        Map<String, AggregateColumn> merged = new LinkedHashMap<>();
        for (AggregateColumn column : Objects.requireNonNull(columns, "columns")) {
            String name = column.column().toLowerCase(Locale.ROOT);
            SourceIntrospector.ident(column.identifier());
            AggregateColumn previous = merged.get(name);
            merged.put(name, previous == null
                    ? new AggregateColumn(name, column.nonNull(), column.aggregate(), column.type(),
                    column.identifier())
                    : new AggregateColumn(name, previous.nonNull() || column.nonNull(),
                    previous.aggregate() != Aggregate.NONE ? previous.aggregate() : column.aggregate(),
                    previous.type() != null ? previous.type() : column.type(), previous.identifier()));
        }
        return new SourceAggregateQuery(source, where == null || where.isBlank() ? null : where,
                List.copyOf(merged.values()));
    }

    public String source() {
        return source;
    }

    public List<AggregateColumn> columns() {
        return columns;
    }

    /** 전체 집계 문장. */
    public String sql() {
        return sql(false);
    }

    /** 전체 집계 문장. {@code bigCount} 면 {@code COUNT_BIG} 으로 센다(SQL Server). */
    public String sql(boolean bigCount) {
        return statement(true, bigCount);
    }

    /** COUNT 전용 문장(물러남). */
    public String countOnlySql() {
        return countOnlySql(false);
    }

    /** COUNT 전용 문장(물러남). {@code bigCount} 면 {@code COUNT_BIG} 으로 센다(SQL Server). */
    public String countOnlySql(boolean bigCount) {
        return statement(false, bigCount);
    }

    /** {@link #sql()}(full) 또는 {@link #countOnlySql()} 결과 한 행을 읽는다. 값은 JDBC 에서 읽은 그대로 넘긴다. */
    public SourceAggregates parse(Object[] values, boolean full) {
        Layout layout = layout(full);
        if (values == null || values.length != layout.size()) {
            throw new IllegalStateException("SOURCE_AGGREGATE_UNREADABLE");
        }
        long rows = ReconciliationValues.count(values[0]);
        Map<String, Long> nonNull = new LinkedHashMap<>();
        Map<String, BigDecimal> sums = new LinkedHashMap<>();
        Map<String, Object> minimums = new LinkedHashMap<>();
        Map<String, Object> maximums = new LinkedHashMap<>();
        Map<String, CoverageReason> gaps = new LinkedHashMap<>();
        for (AggregateColumn column : columns) {
            String name = column.column();
            if (column.nonNull()) {
                nonNull.put(name, ReconciliationValues.count(values[layout.count().get(name)]));
            }
            if (column.aggregate() == Aggregate.NONE) {
                continue;
            }
            if (!full) {
                gaps.put(name, CoverageReason.SOURCE_AGGREGATE_FAILED);
                continue;
            }
            int position = layout.aggregate().get(name);
            if (column.aggregate() == Aggregate.NUM) {
                Object rawSum = values[position];
                BigDecimal sum = rawSum == null ? BigDecimal.ZERO : ReconciliationValues.decimal(rawSum);
                Object min = values[position + 1];
                Object max = values[position + 2];
                BigDecimal minimum = ReconciliationValues.decimal(min);
                BigDecimal maximum = ReconciliationValues.decimal(max);
                if (sum == null || (min != null && minimum == null) || (max != null && maximum == null)) {
                    gaps.put(name, CoverageReason.UNSUPPORTED_VALUE_TYPE);
                    continue;
                }
                sums.put(name, sum);
                putNonNull(minimums, name, minimum);
                putNonNull(maximums, name, maximum);
            } else {
                Object min = values[position];
                Object max = values[position + 1];
                Object minimum = ReconciliationValues.temporal(min);
                Object maximum = ReconciliationValues.temporal(max);
                if ((min != null && minimum == null) || (max != null && maximum == null)
                        || !ReconciliationValues.sameTemporalKind(minimum, maximum)) {
                    gaps.put(name, CoverageReason.UNSUPPORTED_VALUE_TYPE);
                    continue;
                }
                putNonNull(minimums, name, minimum);
                putNonNull(maximums, name, maximum);
            }
        }
        return new SourceAggregates(rows, nonNull, sums, minimums, maximums, gaps);
    }

    @Override
    public String toString() {
        return "SourceAggregateQuery[" + source + "]";
    }

    private String statement(boolean full, boolean bigCount) {
        String count = bigCount ? "COUNT_BIG" : "COUNT";
        List<String> items = new ArrayList<>();
        items.add(count + "(*)");
        for (AggregateColumn column : columns) {
            if (column.nonNull()) {
                items.add(count + "(" + SourceIntrospector.ident(column.identifier()) + ")");
            }
        }
        if (full) {
            for (AggregateColumn column : columns) {
                String ident = SourceIntrospector.ident(column.identifier());
                if (column.aggregate() == Aggregate.NUM) {
                    items.add(sumExpression(ident, column.type()));
                }
                if (column.aggregate() != Aggregate.NONE) {
                    items.add("MIN(" + ident + ")");
                    items.add("MAX(" + ident + ")");
                }
            }
        }
        return "SELECT " + String.join(", ", items) + " FROM " + SourceIntrospector.qualifiedIdent(source)
                + (where == null ? "" : " WHERE " + where);
    }

    /** 문장 안 위치. COUNT 위치는 두 문장이 같다. */
    private Layout layout(boolean full) {
        Map<String, Integer> count = new HashMap<>();
        Map<String, Integer> aggregate = new HashMap<>();
        int position = 1;
        for (AggregateColumn column : columns) {
            if (column.nonNull()) {
                count.put(column.column(), position++);
            }
        }
        if (full) {
            for (AggregateColumn column : columns) {
                if (column.aggregate() == Aggregate.NUM) {
                    aggregate.put(column.column(), position);
                    position += 3;
                } else if (column.aggregate() == Aggregate.TEMPORAL) {
                    aggregate.put(column.column(), position);
                    position += 2;
                }
            }
        }
        return new Layout(position, count, aggregate);
    }

    static String sumExpression(String ident, SourceColumnType type) {
        if (type != null && ColumnClassifier.integral(type.jdbcType())) {
            return "SUM(CAST(" + ident + " AS DECIMAL(38,0)))";
        }
        if (type != null && (type.jdbcType() == Types.DECIMAL || type.jdbcType() == Types.NUMERIC)
                && type.size() != null && type.size() >= 1 && type.size() <= 38
                && type.scale() != null && type.scale() >= 0 && type.scale() <= type.size()) {
            return "SUM(CAST(" + ident + " AS DECIMAL(38," + type.scale() + ")))";
        }
        return "SUM(" + ident + ")";
    }

    private static void putNonNull(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private record Layout(int size, Map<String, Integer> count, Map<String, Integer> aggregate) {}

    /**
     * 집계 컬럼 하나. {@code column} 은 결과를 찾는 소문자 이름, {@code identifier} 는 문장에 쓰는 mapping 철자(대소문자만
     * 다를 수 있다. 다르면 {@code column} 을 쓴다), {@code type} 은 합의 캐스트를 정한다.
     */
    public record AggregateColumn(String column, boolean nonNull, Aggregate aggregate, SourceColumnType type,
                                  String identifier) {

        public AggregateColumn {
            if (column == null || column.isBlank()) {
                throw new IllegalArgumentException("aggregate column must not be blank");
            }
            aggregate = aggregate == null ? Aggregate.NONE : aggregate;
            if (identifier == null || !identifier.equalsIgnoreCase(column)) {
                identifier = column;
            }
        }

        public AggregateColumn(String column, boolean nonNull, Aggregate aggregate, SourceColumnType type) {
            this(column, nonNull, aggregate, type, column);
        }

        /** 컬럼 계획에서 만든다. 원천 컬럼이 없으면 null. */
        public static AggregateColumn of(ColumnCheck check) {
            if (check.sourceColumn() == null || (!check.nonNull() && check.aggregate() == Aggregate.NONE)) {
                return null;
            }
            return new AggregateColumn(check.sourceColumn(), check.nonNull(), check.aggregate(), check.sourceType(),
                    check.sourceIdentifier());
        }
    }
}
