package nuri.migration.verify;

import nuri.migration.domain.DomainViolation;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import org.junit.jupiter.api.DisplayName;
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
import static nuri.migration.verify.ReconciliationRunTest.amount;
import static nuri.migration.verify.ReconciliationRunTest.name;
import static nuri.migration.verify.ReconciliationRunTest.plan;
import static nuri.migration.verify.ReconciliationRunTest.query;
import static nuri.migration.verify.ReconciliationRunTest.row;
import static nuri.migration.verify.ReconciliationRunTest.run;
import static nuri.migration.verify.ReconciliationRunTest.status;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * [ADR-0029 L4 D2] verify 패스의 대상 누적 — NULL 아닌 수·합·최소최대·코드 분포·조회 NULL·형식 도메인·표본 비교.
 */
@DisplayName("대상 누적")
class TargetTallyTest {

    @Test
    @DisplayName("NULL 아닌 수·정확 수치 합·최소·최대를 열 이름 대소문자와 관계없이 센다")
    void countsAndAggregates() {
        TargetTally tally = tally(plan("legacy.orders", null, amount(), name()));

        tally.observe(row("AMT", 5, "NM", "a"), "1");
        tally.observe(row("AMT", new BigDecimal("2.50"), "NM", null), "2");
        tally.observe(row("AMT", null, "NM", "c"), "3");

        assertThat(tally.rows()).isEqualTo(3L);
        assertThat(tally.nonNull("amt")).isEqualTo(2L);
        assertThat(tally.nonNull("nm")).isEqualTo(2L);
        assertThat(tally.sum("amt")).isEqualByComparingTo("7.5");
        assertThat(tally.min("amt")).isEqualTo(new BigDecimal("2.50"));
        assertThat(tally.max("amt")).isEqualTo(BigDecimal.valueOf(5));
        assertThat(tally.aggregateUnknown("amt")).isFalse();
        assertThat(tally.toString()).isEqualTo("TargetTally");
    }

    @Test
    @DisplayName("합할 수 없는 값·시간 종류 혼재는 합·최소최대를 모른다고 남긴다")
    void unknownAggregates() {
        ColumnCheck date = ColumnClassifier.classify(facts().target("d").source("D", DATE).target(contract("date"))
                .build());
        TargetTally tally = tally(plan("legacy.orders", null, amount(), date));

        tally.observe(row("amt", 1.5d, "d", Date.valueOf("2024-01-02")), "1");
        tally.observe(row("amt", 1, "d", Timestamp.valueOf(LocalDateTime.of(2024, 1, 1, 0, 0))), "2");

        assertThat(tally.aggregateUnknown("amt")).isTrue();
        assertThat(tally.sum("amt")).isNull();
        assertThat(tally.aggregateUnknown("d")).isTrue();
        assertThat(tally.min("d")).isEqualTo(LocalDate.of(2024, 1, 2));
    }

    @Test
    @DisplayName("코드 분포·조회 NULL·형식 도메인 위반을 센다")
    void codesLookupsAndDomain() {
        ColumnCheck lookup = ColumnClassifier.classify(facts().target("dept_nm").lookup("dept", true).build());
        ColumnCheck ymd = ColumnClassifier.classify(facts().target("ymd").source("YMD", VARCHAR)
                .target(contract("character varying", term("연월일C8", "VARCHAR"))).build());
        TargetTally tally = tally(plan("legacy.orders", null, status(), lookup, ymd));

        tally.observe(row("st", "A01", "dept_nm", null, "ymd", "20240131"), "1");
        tally.observe(row("st", "A01", "dept_nm", "총무", "ymd", "20240230"), "2");
        tally.observe(row("st", null, "dept_nm", null, "ymd", "y2024"), "3");

        assertThat(tally.codeDistribution("st")).containsOnly(Map.entry("A01", 2L));
        assertThat(tally.nulls("dept_nm")).isEqualTo(2L);
        assertThat(tally.domainViolations("ymd")).containsOnly(Map.entry(DomainViolation.INVALID_DATE, 1L),
                Map.entry(DomainViolation.FORMAT, 1L));
    }

    @Test
    @DisplayName("코드 종류가 상한을 넘으면 분포를 버리고 넘쳤다고 남긴다")
    void codeOverflow() {
        TargetTally tally = tally(plan("legacy.orders", null, status()));

        for (int code = 0; code <= ReconciliationRun.CODE_DISTINCT_LIMIT; code++) {
            tally.observe(row("st", "c" + code), String.valueOf(code));
        }

        assertThat(tally.codeOverflow("st")).isTrue();
        assertThat(tally.codeDistribution("st")).isEmpty();
    }

    @Test
    @DisplayName("표본 키의 행은 원값을 다시 변환해 체크섬과 같은 정규형으로 비교한다")
    void sampleComparison() {
        ColumnCheck trimmed = ColumnClassifier.classify(facts().target("nm").source("NM", VARCHAR)
                .transform("trim", ColumnClassifier.TransformKind.BUILTIN).build());
        MappingPlan mapping = plan("legacy.orders", null, amount(), trimmed, status());
        ReconciliationRun run = run(mapping);
        run.recordSource(mapping.aggregateGroup(), query().parse(new Object[]{2L, 2L, 2L, 0, 0, 0}, true));
        run.table("legacy.orders").accepted(0, row("amt", 5, "nm", " a ", "st", "1"), "1");
        run.table("legacy.orders").accepted(1, row("amt", 6, "nm", " b ", "st", null), "2");
        TargetTally tally = run.targetTally("legacy.orders");

        tally.observe(row("amt", 5L, "nm", "a", "st", "A01"), "1");
        tally.observe(row("amt", new BigDecimal("6.0"), "nm", "x", "st", "Z"), "2");
        tally.observe(row("amt", 7, "nm", "q", "st", "A01"), "not-a-sample");

        assertThat(tally.sampleRows()).isEqualTo(2L);
        assertThat(tally.sampleMismatches()).isEqualTo(1L);
        assertThat(tally.firstMismatchColumn()).isEqualTo("nm");
    }

    @Test
    @DisplayName("재계산이 실패하면 그 컬럼은 불일치다")
    void replayFailureIsAMismatch() {
        ColumnCheck ymd = ColumnClassifier.classify(facts().target("ymd").source("YMD", VARCHAR)
                .transform("ymd8", ColumnClassifier.TransformKind.DOMAIN).build());
        MappingPlan mapping = plan("legacy.orders", null, ymd);
        ReconciliationRun run = run(mapping);
        run.recordSource(mapping.aggregateGroup(), SourceAggregateQuery.of("legacy.orders", null,
                List.of(SourceAggregateQuery.AggregateColumn.of(ymd))).parse(new Object[]{1L, 1L}, true));
        run.table("legacy.orders").accepted(0, row("ymd", "20240230"), "1");
        TargetTally tally = run.targetTally("legacy.orders");

        tally.observe(row("ymd", "20240230"), "1");

        assertThat(tally.sampleMismatches()).isEqualTo(1L);
        assertThat(tally.firstMismatchColumn()).isEqualTo("ymd");
    }

    @Test
    @DisplayName("대상 누적은 매핑마다 새로 만든다 — 같은 실행을 다시 검증해도 겹쳐 세지 않는다")
    void freshTallyPerVerification() {
        ReconciliationRun run = run(plan("legacy.orders", null, name()));
        TargetTally first = run.targetTally("legacy.orders");
        first.observe(row("nm", "a"), "1");
        first.incomplete();

        TargetTally second = run.targetTally("legacy.orders");

        assertThat(second).isNotSameAs(first);
        assertThat(second.nonNull("nm")).isZero();
        assertThat(second.isIncomplete()).isFalse();
        assertThat(first.isIncomplete()).isTrue();
    }

    private static TargetTally tally(MappingPlan mapping) {
        return run(mapping).targetTally(mapping.label());
    }
}
