package nuri.migration.verify;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * [ADR-0029 L4 D2] 원천 집계 결과 홀더 — 행 수, 컬럼마다 NULL 아닌 수·합·최소·최대. 합·최소·최대는 원천 값이므로 직렬화하지
 * 않고 증거·문구에 싣지 않는다. {@code toString} 은 값을 내지 않는다. 컬럼 이름은 소문자로 찾는다.
 */
public final class SourceAggregates {

    private final long rows;
    private final Map<String, Long> nonNull;
    private final Map<String, BigDecimal> sums;
    private final Map<String, Object> minimums;
    private final Map<String, Object> maximums;
    private final Map<String, CoverageReason> aggregateGaps;

    SourceAggregates(long rows, Map<String, Long> nonNull, Map<String, BigDecimal> sums,
                     Map<String, Object> minimums, Map<String, Object> maximums,
                     Map<String, CoverageReason> aggregateGaps) {
        this.rows = rows;
        this.nonNull = Collections.unmodifiableMap(new LinkedHashMap<>(nonNull));
        this.sums = Collections.unmodifiableMap(new LinkedHashMap<>(sums));
        this.minimums = Collections.unmodifiableMap(new LinkedHashMap<>(minimums));
        this.maximums = Collections.unmodifiableMap(new LinkedHashMap<>(maximums));
        this.aggregateGaps = Collections.unmodifiableMap(new LinkedHashMap<>(aggregateGaps));
    }

    /** {@code COUNT(*)}(mapping where 적용). */
    public long rows() {
        return rows;
    }

    /** {@code COUNT(column)}. 재지 않았으면 null. */
    public Long nonNull(String column) {
        return nonNull.get(key(column));
    }

    /** 합. 모든 값이 NULL 이면 0 이다. 재지 않았거나 쓸 수 없으면 null. */
    public BigDecimal sum(String column) {
        return sums.get(key(column));
    }

    /** 최소. 모든 값이 NULL 이면 null. */
    public Object min(String column) {
        return minimums.get(key(column));
    }

    /** 최대. 모든 값이 NULL 이면 null. */
    public Object max(String column) {
        return maximums.get(key(column));
    }

    /** 합·최소·최대를 쓸 수 없는 이유. 쓸 수 있으면 null. */
    public CoverageReason aggregateGap(String column) {
        return aggregateGaps.get(key(column));
    }

    @Override
    public String toString() {
        return "SourceAggregates";
    }

    private static String key(String column) {
        return column == null ? null : column.toLowerCase(Locale.ROOT);
    }
}
