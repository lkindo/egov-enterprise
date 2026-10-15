package nuri.migration.verify;

import nuri.migration.domain.DomainViolation;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] verify 의 대상 재조회 패스에서 매핑 하나의 대상 쪽을 누적한다 — 대상 스캔을 늘리지 않는다.
 *
 * <p>컬럼마다 NULL 아닌 수, 정확 수치의 합·최소·최대, 시간 컬럼의 최소·최대, codemap 컬럼의 값 분포(종류 상한), 조회 컬럼의
 * NULL 수, 형식 도메인 위반을 센다. 표본 키의 행을 만나면 원값을 다시 변환해 컬럼마다 체크섬과 같은 정규형으로 비교한다.
 * 대상 값을 담으므로 직렬화하지 않고 {@code toString} 은 값을 내지 않는다.</p>
 */
public final class TargetTally {

    private final MappingPlan plan;
    private final ColumnReplay replay;
    private final Map<String, Map<String, Object>> samples;
    private final Map<String, String> rowKeys = new HashMap<>();
    private final Map<String, Long> nonNull = new HashMap<>();
    private final Map<String, Long> nulls = new HashMap<>();
    private final Map<String, BigDecimal> sums = new HashMap<>();
    private final Map<String, Object> minimums = new HashMap<>();
    private final Map<String, Object> maximums = new HashMap<>();
    private final Set<String> unknown = new HashSet<>();
    private final Map<String, Map<String, Long>> codes = new HashMap<>();
    private final Set<String> codeOverflow = new HashSet<>();
    private final Map<String, Map<DomainViolation, Long>> domain = new HashMap<>();
    private long rows;
    private long sampleRows;
    private long sampleMismatches;
    private String firstMismatchColumn;
    private boolean incomplete;

    TargetTally(MappingPlan plan, ColumnReplay replay, Map<String, Map<String, Object>> samples) {
        this.plan = Objects.requireNonNull(plan, "plan");
        this.replay = replay;
        this.samples = samples == null ? Map.of() : samples;
    }

    /** 대상 행 하나. {@code key} 는 그 경로의 대상 키 문자열(실행기 checkpoint 의 대상 키와 같다)이다. */
    public void observe(Map<String, Object> row, String key) {
        rows++;
        for (ColumnCheck column : plan.columns()) {
            String name = key(column.targetColumn());
            Object value = value(row, column.targetColumn());
            if (column.nonNull() && value != null) {
                nonNull.merge(name, 1L, Long::sum);
            }
            if (column.lookupAlias() != null && value == null) {
                nulls.merge(name, 1L, Long::sum);
            }
            if (value != null && column.aggregate() == Aggregate.NUM) {
                observeNumber(name, value);
            } else if (value != null && column.aggregate() == Aggregate.TEMPORAL) {
                observeTemporal(name, value);
            }
            if (value != null && column.code()) {
                observeCode(name, value);
            }
            if (value != null && column.domain() != null) {
                DomainViolation violation = DomainConformance.check(column.domain(), value);
                if (violation != null) {
                    domain.computeIfAbsent(name, ignored -> new EnumMap<>(DomainViolation.class))
                            .merge(violation, 1L, Long::sum);
                }
            }
        }
        Map<String, Object> sample = key == null ? null : samples.get(key);
        if (sample != null && replay != null) {
            compareSample(row, sample);
        }
    }

    /** scoped 대조가 중간에 멈췄다 — 대상 쪽 검사는 판정하지 않는다. */
    public void incomplete() {
        incomplete = true;
    }

    public boolean isIncomplete() {
        return incomplete;
    }

    public long rows() {
        return rows;
    }

    public long nonNull(String column) {
        return nonNull.getOrDefault(key(column), 0L);
    }

    public long nulls(String column) {
        return nulls.getOrDefault(key(column), 0L);
    }

    /** 합. 값이 하나도 없으면 0, 합할 수 없는 값이 있었으면 null. */
    public BigDecimal sum(String column) {
        String key = key(column);
        return unknown.contains(key) ? null : sums.getOrDefault(key, BigDecimal.ZERO);
    }

    public Object min(String column) {
        return minimums.get(key(column));
    }

    public Object max(String column) {
        return maximums.get(key(column));
    }

    /** 합·최소·최대를 쓸 수 없는 값(부동소수·벤더 객체·시간 종류 혼재)이 있었는가. */
    public boolean aggregateUnknown(String column) {
        return unknown.contains(key(column));
    }

    public Map<String, Long> codeDistribution(String column) {
        Map<String, Long> distribution = codes.get(key(column));
        return distribution == null ? Map.of() : Collections.unmodifiableMap(distribution);
    }

    public boolean codeOverflow(String column) {
        return codeOverflow.contains(key(column));
    }

    public Map<DomainViolation, Long> domainViolations(String column) {
        Map<DomainViolation, Long> violations = domain.get(key(column));
        return violations == null ? Map.of() : Collections.unmodifiableMap(violations);
    }

    /** 비교한 표본 행 수. */
    public long sampleRows() {
        return sampleRows;
    }

    /** 표본 비교에서 다른 (행, 컬럼) 수. */
    public long sampleMismatches() {
        return sampleMismatches;
    }

    /** 처음 다른 컬럼. 없으면 null. */
    public String firstMismatchColumn() {
        return firstMismatchColumn;
    }

    @Override
    public String toString() {
        return "TargetTally";
    }

    private void observeNumber(String name, Object value) {
        BigDecimal decimal = ReconciliationValues.decimal(value);
        if (decimal == null) {
            unknown.add(name);
            return;
        }
        sums.merge(name, decimal, BigDecimal::add);
        minimums.merge(name, decimal, (left, right) -> ((BigDecimal) left).compareTo((BigDecimal) right) <= 0
                ? left : right);
        maximums.merge(name, decimal, (left, right) -> ((BigDecimal) left).compareTo((BigDecimal) right) >= 0
                ? left : right);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void observeTemporal(String name, Object value) {
        Object temporal = ReconciliationValues.temporal(value);
        Object previous = minimums.get(name);
        if (temporal == null || !ReconciliationValues.sameTemporalKind(previous, temporal)) {
            unknown.add(name);
            return;
        }
        minimums.merge(name, temporal, (left, right) -> ((Comparable) left).compareTo(right) <= 0 ? left : right);
        maximums.merge(name, temporal, (left, right) -> ((Comparable) left).compareTo(right) >= 0 ? left : right);
    }

    private void observeCode(String name, Object value) {
        if (codeOverflow.contains(name)) {
            return;
        }
        Map<String, Long> distribution = codes.computeIfAbsent(name, ignored -> new HashMap<>());
        String code = ReconciliationValues.canonical(value);
        if (!distribution.containsKey(code) && distribution.size() >= ReconciliationRun.CODE_DISTINCT_LIMIT) {
            codeOverflow.add(name);
            codes.remove(name);
            return;
        }
        distribution.merge(code, 1L, Long::sum);
    }

    private void compareSample(Map<String, Object> row, Map<String, Object> sample) {
        sampleRows++;
        for (ColumnCheck column : plan.columns()) {
            if (!column.sampled()) {
                continue;
            }
            Object actual = value(row, column.targetColumn());
            boolean same;
            try {
                Object expected = replay.expected(column.replay(), sample.get(key(column.targetColumn())));
                same = ReconciliationValues.canonical(expected).equals(ReconciliationValues.canonical(actual));
            } catch (ColumnReplay.ReplayFailure failure) {
                same = false;
            }
            if (!same) {
                sampleMismatches++;
                if (firstMismatchColumn == null) {
                    firstMismatchColumn = column.targetColumn();
                }
            }
        }
    }

    /** 행의 열 이름은 쿼리마다 같으므로 대소문자 해석을 한 번만 한다. */
    private Object value(Map<String, Object> row, String column) {
        String name = key(column);
        String actual = rowKeys.get(name);
        if (actual == null || !row.containsKey(actual)) {
            actual = null;
            for (String candidate : row.keySet()) {
                if (candidate != null && candidate.equalsIgnoreCase(column)) {
                    actual = candidate;
                    break;
                }
            }
            if (actual == null) {
                return null;
            }
            rowKeys.put(name, actual);
        }
        return row.get(actual);
    }

    private static String key(String column) {
        return column.toLowerCase(Locale.ROOT);
    }
}
