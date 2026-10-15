package nuri.migration.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.verify.ReconciliationJudge.CheckResult;
import nuri.migration.verify.ReconciliationJudge.ExecutionTotals;
import nuri.migration.verify.ReconciliationJudge.MappingReconciliation;
import nuri.migration.verify.ReconciliationJudge.Uncovered;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.CodeHit;
import nuri.migration.verify.ReconciliationRun.MappingTally;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static nuri.migration.verify.ColumnClassifierTest.DATE;
import static nuri.migration.verify.ColumnClassifierTest.VARCHAR;
import static nuri.migration.verify.ColumnClassifierTest.contract;
import static nuri.migration.verify.ColumnClassifierTest.facts;
import static nuri.migration.verify.ColumnClassifierTest.term;
import static nuri.migration.verify.ReconciliationRunTest.STATUS;
import static nuri.migration.verify.ReconciliationRunTest.amount;
import static nuri.migration.verify.ReconciliationRunTest.name;
import static nuri.migration.verify.ReconciliationRunTest.plan;
import static nuri.migration.verify.ReconciliationRunTest.row;
import static nuri.migration.verify.ReconciliationRunTest.run;
import static nuri.migration.verify.ReconciliationRunTest.status;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * [ADR-0029 L4 D2] 매핑 대사 판정식. 행마다 PASS·FAIL·NOT_COVERED 를 하나씩 고정한다 — 보정 하나(격리·nullify·NULL 대체)가
 * 빠지면 정상 적재가 FAIL 이 되고, 비교 하나가 빠지면 손실이 PASS 가 된다.
 */
@DisplayName("매핑 대사 판정")
class ReconciliationJudgeTest {

    private static final String LABEL = "legacy.orders";

    private static ExecutionTotals totals(long read, long isolated) {
        return new ExecutionTotals(read, isolated, Map.of(), Map.of());
    }

    private static SourceAggregates source(long rows, Map<String, Long> nonNull) {
        return new SourceAggregates(rows, nonNull, Map.of(), Map.of(), Map.of(), Map.of());
    }

    private static SourceAggregates numbers(long rows, long nonNull, String sum, Object min, Object max) {
        return new SourceAggregates(rows, Map.of("amt", nonNull), Map.of("amt", new BigDecimal(sum)),
                min == null ? Map.of() : Map.of("amt", min), max == null ? Map.of() : Map.of("amt", max), Map.of());
    }

    private static CheckResult check(MappingReconciliation result, ReconciliationCheck check) {
        return result.checks().stream().filter(candidate -> candidate.check() == check).findFirst().orElseThrow();
    }

    /** 계획·실행기 수집·대상 누적을 한 번에 꾸린다. */
    private static final class Scenario {
        final MappingPlan plan;
        final ReconciliationRun run;
        final MappingTally executor;
        final TargetTally target;

        Scenario(ColumnCheck... columns) {
            this(plan(LABEL, null, columns));
        }

        Scenario(MappingPlan plan) {
            this.plan = plan;
            this.run = run(plan);
            this.executor = run.table(LABEL);
            this.target = run.targetTally(LABEL);
        }

        @SafeVarargs
        final Scenario rows(Map<String, Object>... rows) {
            int key = 0;
            for (Map<String, Object> row : rows) {
                target.observe(row, "k" + key++);
            }
            return this;
        }

        MappingReconciliation judge(SourceAggregates source, ExecutionTotals totals) {
            return ReconciliationJudge.judge(plan, source, executor, target, totals, true);
        }
    }

    @Nested
    @DisplayName("SOURCE_ROWS")
    class SourceRows {

        @Test
        @DisplayName("원천 행 수와 조회 수가 같으면 PASS, 다르면 FAIL 이고 문구에는 검사 이름만 있다")
        void rowCount() {
            Scenario scenario = new Scenario(name()).rows(row("nm", "a"), row("nm", "b"));

            MappingReconciliation pass = scenario.judge(source(2, Map.of("nm", 2L)), totals(2, 0));
            MappingReconciliation fail = scenario.judge(source(3, Map.of("nm", 2L)), totals(2, 0));

            assertThat(check(pass, ReconciliationCheck.SOURCE_ROWS).status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(pass.status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(pass.firstFailure()).isNull();
            assertThat(check(fail, ReconciliationCheck.SOURCE_ROWS).status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(check(fail, ReconciliationCheck.SOURCE_ROWS).mismatches()).isEqualTo(1L);
            assertThat(fail.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(fail.firstFailure()).isEqualTo("대사 불일치(legacy.orders, check=SOURCE_ROWS)");
        }

        @Test
        @DisplayName("계획이 있는데 원천 집계가 없으면 FAIL 이다")
        void missingSourceAggregates() {
            MappingReconciliation result = new Scenario(name()).judge(null, totals(0, 0));

            assertThat(check(result, ReconciliationCheck.SOURCE_ROWS).reason())
                    .isEqualTo("RECONCILIATION_INPUT_MISSING");
            assertThat(result.firstFailure()).isEqualTo("대사 입력 없음(legacy.orders): RECONCILIATION_INPUT_MISSING");
        }

        @Test
        @DisplayName("dry-run 은 원천 행 수만 판정한다")
        void dryRunJudgesOnlyRowCount() {
            Scenario scenario = new Scenario(name());

            MappingReconciliation result = ReconciliationJudge.judge(scenario.plan, source(2, Map.of("nm", 0L)),
                    scenario.executor, null, totals(2, 0), false);

            assertThat(result.checks()).extracting(CheckResult::check).containsExactly(ReconciliationCheck.SOURCE_ROWS);
            assertThat(result.notCovered()).isEmpty();
            assertThat(result.status()).isEqualTo(ReconciliationVerdict.PASS);
        }
    }

    @Nested
    @DisplayName("NON_NULL")
    class NonNull {

        @Test
        @DisplayName("NULL 아닌 수가 같으면 PASS, 대상이 적으면 FAIL(건수)이다")
        void plain() {
            Scenario scenario = new Scenario(name()).rows(row("nm", "a"), row("nm", null));

            assertThat(check(scenario.judge(source(2, Map.of("nm", 1L)), totals(2, 0)),
                    ReconciliationCheck.NON_NULL).status()).isEqualTo(ReconciliationVerdict.PASS);
            CheckResult lost = check(scenario.judge(source(2, Map.of("nm", 2L)), totals(2, 0)),
                    ReconciliationCheck.NON_NULL);
            assertThat(lost.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(lost.column()).isEqualTo("nm");
            assertThat(lost.mismatches()).isEqualTo(1L);
        }

        @Test
        @DisplayName("nullify 가 NULL 로 바꾼 행 수를 뺀다")
        void nullifiedRowsAreSubtracted() {
            Scenario scenario = new Scenario(name()).rows(row("nm", "a"), row("nm", null));

            MappingReconciliation result = scenario.judge(source(2, Map.of("nm", 2L)),
                    new ExecutionTotals(2, 0, Map.of("NM", 1L), Map.of()));

            assertThat(check(result, ReconciliationCheck.NON_NULL).status()).isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("nullAs: fallback 이 NULL 을 대체값으로 바꾼 행 수를 더한다")
        void nullFallbacksAreAdded() {
            Scenario scenario = new Scenario(status()).rows(row("st", "A01"), row("st", "Z"), row("st", "Z"));
            for (Object raw : new Object[]{"1", null, null}) {
                scenario.executor.codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, raw))));
            }

            MappingReconciliation result = scenario.judge(source(3, Map.of("st", 1L)), totals(3, 0));

            assertThat(check(result, ReconciliationCheck.NON_NULL).status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(check(result, ReconciliationCheck.CODE_DISTRIBUTION).status())
                    .isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("격리 행의 NULL 아닌 수를 뺀다")
        void isolatedRowsAreSubtracted() {
            Scenario scenario = new Scenario(name()).rows(row("nm", "a"));
            scenario.executor.isolated(row("nm", "b"), Map.of("order_id", 2));

            MappingReconciliation result = scenario.judge(source(2, Map.of("nm", 2L)), totals(2, 1));

            assertThat(check(result, ReconciliationCheck.NON_NULL).status()).isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("원천 NULL 아닌 수를 재지 못했으면 판정하지 않는다")
        void unmeasuredSourceIsNotCovered() {
            CheckResult result = check(new Scenario(name()).rows(row("nm", "a")).judge(source(1, Map.of()),
                    totals(1, 0)), ReconciliationCheck.NON_NULL);

            assertThat(result.status()).isEqualTo(ReconciliationVerdict.NOT_COVERED);
            assertThat(result.reason()).isEqualTo("SOURCE_AGGREGATE_FAILED");
        }
    }

    @Nested
    @DisplayName("SUM·MIN_MAX")
    class Aggregates {

        @Test
        @DisplayName("원천 합 − 격리 합 = 대상 합이면 PASS 이고, 비교는 compareTo 다")
        void sumWithIsolation() {
            Scenario scenario = new Scenario(amount()).rows(row("amt", new BigDecimal("4.00")), row("amt", 6L));
            scenario.executor.isolated(row("amt", 5), Map.of("order_id", 9));

            MappingReconciliation result = scenario.judge(numbers(3, 3, "15.0", BigDecimal.valueOf(4),
                    BigDecimal.valueOf(6)), totals(3, 1));

            assertThat(check(result, ReconciliationCheck.SUM).status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(check(result, ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("값이 바뀌면 SUM FAIL — 체크섬이 맞아도 원천과 어긋나면 잡는다")
        void sumMismatch() {
            Scenario scenario = new Scenario(amount()).rows(row("amt", 4), row("amt", 7));

            MappingReconciliation result = scenario.judge(numbers(2, 2, "10", BigDecimal.valueOf(4),
                    BigDecimal.valueOf(6)), totals(2, 0));

            assertThat(check(result, ReconciliationCheck.SUM).status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(check(result, ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(result.firstFailure()).isEqualTo("대사 불일치(legacy.orders, column=amt, check=SUM)");
        }

        @Test
        @DisplayName("격리가 있으면 최소·최대는 원천 범위 안이면 된다 — 밖이면 FAIL")
        void minMaxWithinRangeWhenIsolated() {
            Scenario inside = new Scenario(amount()).rows(row("amt", 5));
            inside.executor.isolated(row("amt", 1), Map.of("order_id", 1));
            Scenario outside = new Scenario(amount()).rows(row("amt", 9));
            outside.executor.isolated(row("amt", 1), Map.of("order_id", 1));
            Scenario allIsolated = new Scenario(amount());
            allIsolated.executor.isolated(row("amt", 1), Map.of("order_id", 1));

            assertThat(check(inside.judge(numbers(2, 2, "6", BigDecimal.ONE, BigDecimal.valueOf(5)), totals(2, 1)),
                    ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(check(outside.judge(numbers(2, 2, "6", BigDecimal.ONE, BigDecimal.valueOf(5)), totals(2, 1)),
                    ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(check(allIsolated.judge(numbers(1, 1, "1", BigDecimal.ONE, BigDecimal.ONE), totals(1, 1)),
                    ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("격리가 없으면 최소·최대가 같아야 한다 — 범위 안이어도 다르면 FAIL")
        void minMaxEqualWithoutIsolation() {
            Scenario scenario = new Scenario(amount()).rows(row("amt", 2), row("amt", 5));

            assertThat(check(scenario.judge(numbers(2, 2, "7", BigDecimal.ONE, BigDecimal.valueOf(6)), totals(2, 0)),
                    ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.FAIL);
        }

        @Test
        @DisplayName("원천 집계가 물러났거나 합할 수 없는 값이 있으면 판정하지 않는다")
        void notCoveredAggregates() {
            Scenario failedSource = new Scenario(amount()).rows(row("amt", 1));
            SourceAggregates countOnly = new SourceAggregates(1, Map.of("amt", 1L), Map.of(), Map.of(), Map.of(),
                    Map.of("amt", CoverageReason.SOURCE_AGGREGATE_FAILED));
            Scenario isolatedUnknown = new Scenario(amount()).rows(row("amt", 1));
            isolatedUnknown.executor.isolated(row("amt", 1.5d), Map.of("order_id", 1));
            Scenario targetUnknown = new Scenario(amount()).rows(row("amt", 1.5d));

            MappingReconciliation first = failedSource.judge(countOnly, totals(1, 0));
            MappingReconciliation second = isolatedUnknown.judge(numbers(2, 2, "3", BigDecimal.ONE,
                    BigDecimal.ONE), totals(2, 1));
            MappingReconciliation third = targetUnknown.judge(numbers(1, 1, "1", BigDecimal.ONE, BigDecimal.ONE),
                    totals(1, 0));

            assertThat(check(first, ReconciliationCheck.SUM).reason()).isEqualTo("SOURCE_AGGREGATE_FAILED");
            assertThat(check(first, ReconciliationCheck.MIN_MAX).reason()).isEqualTo("SOURCE_AGGREGATE_FAILED");
            assertThat(check(second, ReconciliationCheck.SUM).reason()).isEqualTo("UNSUPPORTED_VALUE_TYPE");
            assertThat(check(second, ReconciliationCheck.MIN_MAX).status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(check(third, ReconciliationCheck.SUM).reason()).isEqualTo("UNSUPPORTED_VALUE_TYPE");
            assertThat(check(third, ReconciliationCheck.MIN_MAX).reason()).isEqualTo("UNSUPPORTED_VALUE_TYPE");
            assertThat(first.status()).isEqualTo(ReconciliationVerdict.PASS);
        }

        @Test
        @DisplayName("시간 최소·최대는 같은 종류끼리 비교하고 종류가 다르면 판정하지 않는다")
        void temporalMinMax() {
            ColumnCheck date = ColumnClassifier.classify(facts().target("d").source("D", DATE)
                    .target(contract("date")).build());
            Scenario same = new Scenario(date).rows(row("d", Date.valueOf("2024-01-01")),
                    row("d", Date.valueOf("2024-02-01")));
            SourceAggregates source = new SourceAggregates(2, Map.of("d", 2L), Map.of(),
                    Map.of("d", LocalDate.of(2024, 1, 1)), Map.of("d", LocalDate.of(2024, 2, 1)), Map.of());
            SourceAggregates mixed = new SourceAggregates(2, Map.of("d", 2L), Map.of(),
                    Map.of("d", LocalDateTime.of(2024, 1, 1, 0, 0)), Map.of("d", LocalDateTime.of(2024, 2, 1, 0, 0)),
                    Map.of());

            assertThat(check(same.judge(source, totals(2, 0)), ReconciliationCheck.MIN_MAX).status())
                    .isEqualTo(ReconciliationVerdict.PASS);
            assertThat(check(same.judge(mixed, totals(2, 0)), ReconciliationCheck.MIN_MAX).reason())
                    .isEqualTo("UNSUPPORTED_VALUE_TYPE");
            assertThat(same.judge(source, totals(2, 0)).checks()).extracting(CheckResult::check)
                    .doesNotContain(ReconciliationCheck.SUM);
            Scenario shifted = new Scenario(date).rows(row("d", Timestamp.valueOf("2024-01-01 00:00:00")));
            assertThat(shifted.target.aggregateUnknown("d")).isFalse();
        }
    }

    @Nested
    @DisplayName("CODE_DISTRIBUTION·LOOKUP_NULL_FLOOR·DOMAIN")
    class CodesLookupsDomain {

        @Test
        @DisplayName("codemap 결과 분포와 대상 분포가 다르면 FAIL(다른 코드 수)이다")
        void codeDistribution() {
            Scenario scenario = new Scenario(status()).rows(row("st", "A01"), row("st", "A01"));
            for (Object raw : new Object[]{"1", "2"}) {
                scenario.executor.codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, raw))));
            }

            CheckResult result = check(scenario.judge(source(2, Map.of("st", 2L)), totals(2, 0)),
                    ReconciliationCheck.CODE_DISTRIBUTION);

            assertThat(result.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(result.mismatches()).isEqualTo(2L);
        }

        @Test
        @DisplayName("어느 쪽이든 종류 상한을 넘으면 판정하지 않는다")
        void codeOverflow() {
            Scenario scenario = new Scenario(status());
            for (int code = 0; code <= ReconciliationRun.CODE_DISTINCT_LIMIT; code++) {
                scenario.target.observe(row("st", "c" + code), "k" + code);
            }

            CheckResult result = check(scenario.judge(source(1001, Map.of("st", 1001L)), totals(1001, 0)),
                    ReconciliationCheck.CODE_DISTRIBUTION);

            assertThat(result.status()).isEqualTo(ReconciliationVerdict.NOT_COVERED);
            assertThat(result.reason()).isEqualTo("CODE_DISTINCT_OVERFLOW");
        }

        @Test
        @DisplayName("at_most_one 조회 컬럼의 대상 NULL 수는 짝 없음 수 이상이어야 한다")
        void lookupNullFloor() {
            ColumnCheck lookup = ColumnClassifier.classify(facts().target("dept_nm").lookup("dept", true).build());
            Scenario scenario = new Scenario(lookup).rows(row("dept_nm", null), row("dept_nm", "총무"));

            assertThat(check(scenario.judge(source(2, Map.of()), new ExecutionTotals(2, 0, Map.of(),
                    Map.of("DEPT", 1L))), ReconciliationCheck.LOOKUP_NULL_FLOOR).status())
                    .isEqualTo(ReconciliationVerdict.PASS);
            CheckResult below = check(scenario.judge(source(2, Map.of()), new ExecutionTotals(2, 0, Map.of(),
                    Map.of("dept", 2L))), ReconciliationCheck.LOOKUP_NULL_FLOOR);
            assertThat(below.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(below.mismatches()).isEqualTo(1L);
        }

        @Test
        @DisplayName("형식 도메인 위반이 있으면 가장 많은 위반 코드로 FAIL 이고 행 수를 싣는다")
        void domain() {
            ColumnCheck ymd = ColumnClassifier.classify(facts().target("ymd").source("YMD", VARCHAR)
                    .target(contract("character varying", term("연월일C8", "VARCHAR"))).build());
            Scenario scenario = new Scenario(ymd).rows(row("ymd", "20240230"), row("ymd", "20230229"),
                    row("ymd", "2024-01-01"), row("ymd", "20240131"));

            CheckResult result = check(scenario.judge(source(4, Map.of("ymd", 4L)), totals(4, 0)),
                    ReconciliationCheck.DOMAIN);

            assertThat(result.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(result.reason()).isEqualTo("INVALID_DATE");
            assertThat(result.rows()).isEqualTo(3L);
            assertThat(check(new Scenario(ymd).rows(row("ymd", "20240131")).judge(source(1, Map.of("ymd", 1L)),
                    totals(1, 0)), ReconciliationCheck.DOMAIN).status()).isEqualTo(ReconciliationVerdict.PASS);
        }
    }

    @Nested
    @DisplayName("SAMPLE·패스 중단·판정하지 않은 검사")
    class SampleAndCoverage {

        @Test
        @DisplayName("표본 불일치는 FAIL, 표본이 없으면 NO_ROWS, 대상 생성 키는 GENERATED_IDENTITY 다")
        void sample() {
            MappingPlan plan = plan(LABEL, null, name());
            ReconciliationRun run = run(plan);
            run.recordSource(plan.aggregateGroup(), source(1, Map.of("nm", 1L)));
            run.table(LABEL).accepted(0, row("nm", "a"), "k0");
            TargetTally mismatch = run.targetTally(LABEL);
            mismatch.observe(row("nm", "b"), "k0");
            TargetTally match = run.targetTally(LABEL);
            match.observe(row("nm", "a"), "k0");

            CheckResult failed = check(ReconciliationJudge.judge(plan, source(1, Map.of("nm", 1L)), run.table(LABEL),
                    mismatch, totals(1, 0), true), ReconciliationCheck.SAMPLE);
            CheckResult passed = check(ReconciliationJudge.judge(plan, source(1, Map.of("nm", 1L)), run.table(LABEL),
                    match, totals(1, 0), true), ReconciliationCheck.SAMPLE);
            CheckResult none = check(new Scenario(name()).rows(row("nm", "a")).judge(source(1, Map.of("nm", 1L)),
                    totals(1, 0)), ReconciliationCheck.SAMPLE);
            MappingPlan generated = new MappingPlan(LABEL, "legacy.orders", null, null, "public.tb_order",
                    List.of(name()), List.of("order_id"), false, false, true);
            CheckResult identity = check(new Scenario(generated).judge(source(0, Map.of("nm", 0L)), totals(0, 0)),
                    ReconciliationCheck.SAMPLE);

            assertThat(failed.status()).isEqualTo(ReconciliationVerdict.FAIL);
            assertThat(failed.column()).isEqualTo("nm");
            assertThat(failed.mismatches()).isEqualTo(1L);
            assertThat(passed.status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(passed.rows()).isEqualTo(1L);
            assertThat(passed.columns()).isEqualTo(1);
            assertThat(none.reason()).isEqualTo("NO_ROWS");
            assertThat(identity.reason()).isEqualTo("GENERATED_IDENTITY");
        }

        @Test
        @DisplayName("대상 패스가 멈췄으면 대상 쪽 검사는 TARGET_PASS_INCOMPLETE 이고 표 상태를 바꾸지 않는다")
        void incompleteTargetPass() {
            Scenario scenario = new Scenario(amount(), name(), status());
            scenario.target.incomplete();

            MappingReconciliation result = scenario.judge(source(1, Map.of()), totals(1, 0));

            assertThat(result.status()).isEqualTo(ReconciliationVerdict.PASS);
            assertThat(result.checks()).filteredOn(check -> check.check() != ReconciliationCheck.SOURCE_ROWS)
                    .isNotEmpty()
                    .allSatisfy(check -> {
                        assertThat(check.status()).isEqualTo(ReconciliationVerdict.NOT_COVERED);
                        assertThat(check.reason()).isEqualTo("TARGET_PASS_INCOMPLETE");
                    });
            assertThat(result.checks()).extracting(CheckResult::check).contains(ReconciliationCheck.SUM,
                    ReconciliationCheck.MIN_MAX, ReconciliationCheck.CODE_DISTRIBUTION, ReconciliationCheck.SAMPLE);
        }

        @Test
        @DisplayName("계획 단계에서 판정하지 않기로 한 검사를 컬럼과 함께 남긴다")
        void plannedGapsAreReported() {
            ColumnCheck encrypted = ColumnClassifier.classify(facts().target("rrno").source("RRNO", VARCHAR)
                    .encrypted().build());

            MappingReconciliation result = new Scenario(encrypted).judge(source(0, Map.of()), totals(0, 0));

            assertThat(result.notCovered()).containsExactly(
                    new Uncovered("rrno", ReconciliationCheck.NON_NULL, CoverageReason.ENCRYPTED),
                    new Uncovered("rrno", ReconciliationCheck.SAMPLE, CoverageReason.ENCRYPTED));
            assertThat(result.status()).isEqualTo(ReconciliationVerdict.PASS);
        }
    }

    @Test
    @DisplayName("증거 기록에는 검사·결과·건수만 있고 원천·대상 값은 없다")
    void evidenceCarriesNoValues() throws Exception {
        Scenario scenario = new Scenario(amount(), name()).rows(row("amt", 918273645, "nm", "probe-7f3a-nm"));
        scenario.executor.isolated(row("amt", 1, "nm", "probe-7f3a-iso"), Map.of("order_id", "probe-7f3a-key"));
        MappingReconciliation result = scenario.judge(numbers(2, 2, "918273646", BigDecimal.ONE,
                BigDecimal.valueOf(918273645)), totals(2, 1));

        ReconciliationEvidence evidence = new ReconciliationEvidence(ReconciliationEvidence.replicationRole(true),
                List.of(ReconciliationEvidence.MappingRecord.of(LABEL, null, "public.tb_order", result)),
                List.of(), List.of(), List.of(), List.of(), List.of());
        String json = new ObjectMapper().writeValueAsString(evidence);

        assertThat(json).doesNotContain("918273645", "918273646", "probe-7f3a");
        assertThat(json).contains("\"replicationRole\":\"ORIGIN\"", "\"check\":\"SUM\"", "\"status\":\"PASS\"");
        assertThat(json).doesNotContain("\"references\"", "\"codeSets\"", "\"mapping\":");
        assertThat(ReconciliationEvidence.replicationRole(null)).isEqualTo("NOT_CHECKED");
        assertThat(ReconciliationEvidence.replicationRole(false)).isEqualTo("NOT_ORIGIN");
        assertThat(scenario.run.toString() + scenario.executor + scenario.target).doesNotContain("probe-7f3a");
    }
}
