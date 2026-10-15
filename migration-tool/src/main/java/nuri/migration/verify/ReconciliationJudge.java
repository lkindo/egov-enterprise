package nuri.migration.verify;

import nuri.migration.domain.DomainViolation;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.MappingTally;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] 매핑 하나의 대사 판정. 원천 집계·실행기 수집·대상 누적·실행 결과 건수를 맞춘다.
 *
 * <table>
 *   <caption>판정식</caption>
 *   <tr><th>검사</th><th>식</th></tr>
 *   <tr><td>SOURCE_ROWS</td><td>원천 {@code COUNT(*)} = 조회 수. 계획이 있는데 원천 집계가 없으면 FAIL</td></tr>
 *   <tr><td>NON_NULL</td><td>원천 NULL 아닌 수 − 격리 행의 NULL 아닌 수 − nullify + NULL 대체 = 대상 NULL 아닌 수</td></tr>
 *   <tr><td>SUM</td><td>원천 합 − 격리 행 합 = 대상 합({@code compareTo})</td></tr>
 *   <tr><td>MIN_MAX</td><td>격리가 없으면 최소·최대가 같다. 있으면 대상이 원천 범위 안이다</td></tr>
 *   <tr><td>CODE_DISTRIBUTION</td><td>실행기의 codemap 결과 분포 = 대상 분포</td></tr>
 *   <tr><td>LOOKUP_NULL_FLOOR</td><td>대상 NULL 수 ≥ 짝 없음 수</td></tr>
 *   <tr><td>DOMAIN</td><td>형식 도메인 위반 0</td></tr>
 *   <tr><td>SAMPLE</td><td>표본 재계산 불일치 0. 표본이 없으면 NOT_COVERED</td></tr>
 * </table>
 *
 * <p>dry-run 은 원천 행 수만 판정한다. 대상 패스가 중간에 멈췄으면 대상 쪽 검사는 NOT_COVERED 다. 결과에는 검사 이름·결과·건수·
 * 사유 코드만 싣고 값(합·최소·최대·코드·키)은 싣지 않는다.</p>
 */
public final class ReconciliationJudge {

    private ReconciliationJudge() {
    }

    /**
     * 실행 결과의 건수. 실행기의 표 결과에서 옮긴다 — {@code nullified} 는 대상 컬럼마다, {@code lookupMisses} 는 조회 별칭마다의
     * 행 수다.
     */
    public record ExecutionTotals(long read, long isolated, Map<String, Long> nullified,
                                  Map<String, Long> lookupMisses) {

        public ExecutionTotals {
            nullified = lowerKeys(nullified);
            lookupMisses = lowerKeys(lookupMisses);
        }

        private static Map<String, Long> lowerKeys(Map<String, Long> counts) {
            Map<String, Long> lower = new HashMap<>();
            if (counts != null) {
                counts.forEach((key, value) -> lower.merge(key.toLowerCase(Locale.ROOT), value, Long::sum));
            }
            return Map.copyOf(lower);
        }
    }

    /** 검사 하나의 결과. {@code reason} 은 NOT_COVERED 사유나 고정 FAIL 사유 코드다. */
    public record CheckResult(ReconciliationCheck check, String column, ReconciliationVerdict status, String reason,
                              Long rows, Integer columns, Long mismatches) {}

    /** 계획 단계에서 판정하지 않기로 한 검사. */
    public record Uncovered(String column, ReconciliationCheck check, CoverageReason reason) {}

    /** 매핑 하나의 판정. {@code firstFailure} 는 보고 문구(검사·컬럼 이름만)다. FAIL 이 없으면 null. */
    public record MappingReconciliation(ReconciliationVerdict status, List<CheckResult> checks,
                                        List<Uncovered> notCovered, String firstFailure) {

        public MappingReconciliation {
            checks = List.copyOf(checks);
            notCovered = List.copyOf(notCovered);
        }
    }

    public static MappingReconciliation judge(MappingPlan plan, SourceAggregates source, MappingTally src,
                                              TargetTally tgt, ExecutionTotals totals, boolean commit) {
        Objects.requireNonNull(plan, "plan");
        Objects.requireNonNull(totals, "totals");
        List<CheckResult> checks = new ArrayList<>();
        List<Uncovered> notCovered = new ArrayList<>();
        if (source == null) {
            checks.add(fail(ReconciliationCheck.SOURCE_ROWS, null, "RECONCILIATION_INPUT_MISSING", null, null));
        } else {
            boolean same = source.rows() == totals.read();
            checks.add(new CheckResult(ReconciliationCheck.SOURCE_ROWS, null,
                    same ? ReconciliationVerdict.PASS : ReconciliationVerdict.FAIL, null, source.rows(), null,
                    same ? null : Math.abs(source.rows() - totals.read())));
        }
        if (commit) {
            MappingTally executor = src == null ? ReconciliationRun.MappingTally.NOOP : src;
            if (tgt == null || tgt.isIncomplete()) {
                incomplete(plan, checks);
            } else {
                for (ColumnCheck column : plan.columns()) {
                    judgeColumn(column, source, executor, tgt, totals, checks);
                }
                judgeSample(plan, tgt, checks);
            }
            for (ColumnCheck column : plan.columns()) {
                for (ColumnCheck.Gap gap : column.gaps()) {
                    notCovered.add(new Uncovered(column.targetColumn(), gap.check(), gap.reason()));
                }
            }
        }
        CheckResult failure = checks.stream()
                .filter(check -> check.status() == ReconciliationVerdict.FAIL)
                .findFirst().orElse(null);
        return new MappingReconciliation(
                failure == null ? ReconciliationVerdict.PASS : ReconciliationVerdict.FAIL,
                checks, notCovered, failure == null ? null : failureNote(plan.label(), failure));
    }

    private static void judgeColumn(ColumnCheck column, SourceAggregates source, MappingTally src, TargetTally tgt,
                                    ExecutionTotals totals, List<CheckResult> checks) {
        String target = column.targetColumn();
        String sourceColumn = column.sourceColumn();
        if (column.nonNull()) {
            Long sourceNonNull = source == null ? null : source.nonNull(sourceColumn);
            if (sourceNonNull == null) {
                checks.add(notCovered(ReconciliationCheck.NON_NULL, target, CoverageReason.SOURCE_AGGREGATE_FAILED));
            } else {
                long expected = sourceNonNull - src.isolatedNonNull(target)
                        - totals.nullified().getOrDefault(lower(target), 0L)
                        + (column.nullFallbackable() ? src.nullFallbacks(target) : 0L);
                long actual = tgt.nonNull(target);
                checks.add(expected == actual
                        ? pass(ReconciliationCheck.NON_NULL, target, actual, null)
                        : fail(ReconciliationCheck.NON_NULL, target, null, null, Math.abs(expected - actual)));
            }
        }
        if (column.aggregate() != Aggregate.NONE) {
            judgeAggregate(column, source, src, tgt, totals, checks);
        }
        if (column.code()) {
            judgeCodes(target, src, tgt, checks);
        }
        if (column.lookupAlias() != null) {
            long misses = totals.lookupMisses().getOrDefault(lower(column.lookupAlias()), 0L);
            long nulls = tgt.nulls(target);
            checks.add(nulls >= misses
                    ? pass(ReconciliationCheck.LOOKUP_NULL_FLOOR, target, nulls, null)
                    : fail(ReconciliationCheck.LOOKUP_NULL_FLOOR, target, null, null, misses - nulls));
        }
        if (column.domain() != null) {
            Map<DomainViolation, Long> violations = tgt.domainViolations(target);
            if (violations.isEmpty()) {
                checks.add(pass(ReconciliationCheck.DOMAIN, target, null, null));
            } else {
                DomainViolation worst = null;
                long rows = 0;
                for (DomainViolation violation : DomainViolation.values()) {
                    long count = violations.getOrDefault(violation, 0L);
                    rows += count;
                    if (count > 0 && (worst == null || count > violations.get(worst))) {
                        worst = violation;
                    }
                }
                checks.add(fail(ReconciliationCheck.DOMAIN, target, worst.name(), rows, null));
            }
        }
    }

    private static void judgeAggregate(ColumnCheck column, SourceAggregates source, MappingTally src,
                                       TargetTally tgt, ExecutionTotals totals, List<CheckResult> checks) {
        String target = column.targetColumn();
        CoverageReason gap = source == null ? CoverageReason.SOURCE_AGGREGATE_FAILED
                : source.aggregateGap(column.sourceColumn());
        if (gap == null && tgt.aggregateUnknown(target)) {
            gap = CoverageReason.UNSUPPORTED_VALUE_TYPE;
        }
        boolean num = column.aggregate() == Aggregate.NUM;
        if (num) {
            BigDecimal isolatedSum = src.isolatedSum(target);
            BigDecimal sourceSum = source == null ? null : source.sum(column.sourceColumn());
            CoverageReason sumGap = gap != null ? gap
                    : sourceSum == null ? CoverageReason.SOURCE_AGGREGATE_FAILED
                    : isolatedSum == null ? CoverageReason.UNSUPPORTED_VALUE_TYPE : null;
            if (sumGap != null) {
                checks.add(notCovered(ReconciliationCheck.SUM, target, sumGap));
            } else {
                BigDecimal expected = sourceSum.subtract(isolatedSum);
                checks.add(expected.compareTo(tgt.sum(target)) == 0
                        ? pass(ReconciliationCheck.SUM, target, null, null)
                        : fail(ReconciliationCheck.SUM, target, null, null, null));
            }
        }
        if (gap != null) {
            checks.add(notCovered(ReconciliationCheck.MIN_MAX, target, gap));
            return;
        }
        Object sourceMin = source.min(column.sourceColumn());
        Object sourceMax = source.max(column.sourceColumn());
        Object targetMin = tgt.min(target);
        Object targetMax = tgt.max(target);
        if (!ReconciliationValues.sameTemporalKind(sourceMin, targetMin)
                || !ReconciliationValues.sameTemporalKind(sourceMax, targetMax)) {
            checks.add(notCovered(ReconciliationCheck.MIN_MAX, target, CoverageReason.UNSUPPORTED_VALUE_TYPE));
            return;
        }
        boolean same = totals.isolated() == 0
                ? compare(sourceMin, targetMin) == 0 && compare(sourceMax, targetMax) == 0
                : targetMin == null
                || (sourceMin != null && sourceMax != null
                && compare(targetMin, sourceMin) >= 0 && compare(targetMax, sourceMax) <= 0);
        checks.add(same
                ? pass(ReconciliationCheck.MIN_MAX, target, null, null)
                : fail(ReconciliationCheck.MIN_MAX, target, null, null, null));
    }

    private static void judgeCodes(String target, MappingTally src, TargetTally tgt, List<CheckResult> checks) {
        if (src.codeOverflow(target) || tgt.codeOverflow(target)) {
            checks.add(notCovered(ReconciliationCheck.CODE_DISTRIBUTION, target,
                    CoverageReason.CODE_DISTINCT_OVERFLOW));
            return;
        }
        Map<String, Long> expected = src.codeDistribution(target);
        Map<String, Long> actual = tgt.codeDistribution(target);
        Set<String> codes = new HashSet<>(expected.keySet());
        codes.addAll(actual.keySet());
        long differing = codes.stream()
                .filter(code -> !Objects.equals(expected.get(code), actual.get(code)))
                .count();
        checks.add(differing == 0
                ? pass(ReconciliationCheck.CODE_DISTRIBUTION, target, null, null)
                : fail(ReconciliationCheck.CODE_DISTRIBUTION, target, null, null, differing));
    }

    private static void judgeSample(MappingPlan plan, TargetTally tgt, List<CheckResult> checks) {
        if (!plan.hasSampledColumns()) {
            return;
        }
        if (plan.generatedIdentity()) {
            checks.add(notCovered(ReconciliationCheck.SAMPLE, null, CoverageReason.GENERATED_IDENTITY));
            return;
        }
        if (tgt.sampleRows() == 0) {
            checks.add(notCovered(ReconciliationCheck.SAMPLE, null, CoverageReason.NO_ROWS));
            return;
        }
        int columns = (int) plan.columns().stream().filter(ColumnCheck::sampled).count();
        checks.add(tgt.sampleMismatches() == 0
                ? new CheckResult(ReconciliationCheck.SAMPLE, null, ReconciliationVerdict.PASS, null,
                tgt.sampleRows(), columns, null)
                : new CheckResult(ReconciliationCheck.SAMPLE, tgt.firstMismatchColumn(), ReconciliationVerdict.FAIL,
                null, tgt.sampleRows(), columns, tgt.sampleMismatches()));
    }

    /** 대상 패스가 멈춰 대상 쪽 검사를 판정하지 않는다. */
    private static void incomplete(MappingPlan plan, List<CheckResult> checks) {
        for (ColumnCheck column : plan.columns()) {
            String target = column.targetColumn();
            if (column.nonNull()) {
                checks.add(notCovered(ReconciliationCheck.NON_NULL, target, CoverageReason.TARGET_PASS_INCOMPLETE));
            }
            if (column.aggregate() == Aggregate.NUM) {
                checks.add(notCovered(ReconciliationCheck.SUM, target, CoverageReason.TARGET_PASS_INCOMPLETE));
            }
            if (column.aggregate() != Aggregate.NONE) {
                checks.add(notCovered(ReconciliationCheck.MIN_MAX, target, CoverageReason.TARGET_PASS_INCOMPLETE));
            }
            if (column.code()) {
                checks.add(notCovered(ReconciliationCheck.CODE_DISTRIBUTION, target,
                        CoverageReason.TARGET_PASS_INCOMPLETE));
            }
            if (column.lookupAlias() != null) {
                checks.add(notCovered(ReconciliationCheck.LOOKUP_NULL_FLOOR, target,
                        CoverageReason.TARGET_PASS_INCOMPLETE));
            }
            if (column.domain() != null) {
                checks.add(notCovered(ReconciliationCheck.DOMAIN, target, CoverageReason.TARGET_PASS_INCOMPLETE));
            }
        }
        if (plan.hasSampledColumns()) {
            checks.add(notCovered(ReconciliationCheck.SAMPLE, null, CoverageReason.TARGET_PASS_INCOMPLETE));
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static int compare(Object left, Object right) {
        if (left == null || right == null) {
            return left == right ? 0 : left == null ? -1 : 1;
        }
        return ((Comparable) left).compareTo(right);
    }

    private static String failureNote(String label, CheckResult failure) {
        if ("RECONCILIATION_INPUT_MISSING".equals(failure.reason())) {
            return "대사 입력 없음(" + label + "): RECONCILIATION_INPUT_MISSING";
        }
        return "대사 불일치(" + label + (failure.column() == null ? "" : ", column=" + failure.column())
                + ", check=" + failure.check() + ")";
    }

    private static CheckResult pass(ReconciliationCheck check, String column, Long rows, Integer columns) {
        return new CheckResult(check, column, ReconciliationVerdict.PASS, null, rows, columns, null);
    }

    private static CheckResult fail(ReconciliationCheck check, String column, String reason, Long rows,
                                    Long mismatches) {
        return new CheckResult(check, column, ReconciliationVerdict.FAIL, reason, rows, null, mismatches);
    }

    private static CheckResult notCovered(ReconciliationCheck check, String column, CoverageReason reason) {
        return new CheckResult(check, column, ReconciliationVerdict.NOT_COVERED, reason.name(), null, null, null);
    }

    private static String lower(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
