package nuri.migration.verify;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.CodeTranslator.Translation;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.AggregateGroup;
import nuri.migration.verify.ReconciliationRun.CodeHit;
import nuri.migration.verify.ReconciliationRun.MappingTally;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static nuri.migration.verify.ColumnClassifierTest.DOUBLE;
import static nuri.migration.verify.ColumnClassifierTest.INT;
import static nuri.migration.verify.ColumnClassifierTest.VARCHAR;
import static nuri.migration.verify.ColumnClassifierTest.contract;
import static nuri.migration.verify.ColumnClassifierTest.facts;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 실행기 쪽 수집 — 원천 집계 묶음, 격리 행 기여·대상 PK, codemap 분포·종류·위치, 표본 간격·상한.
 */
@DisplayName("대사 수집 홀더")
class ReconciliationRunTest {

    static final CodeMap STATUS = new CodeMap(ordered("1", "A01", "2", "A02", "3", "A03"), UnmappedPolicy.PASSTHROUGH,
            "Z", NullPolicy.FALLBACK);

    static ColumnCheck amount() {
        return ColumnClassifier.classify(facts().target("amt").source("AMT", INT).target(contract("integer")).build());
    }

    static ColumnCheck name() {
        return ColumnClassifier.classify(facts().target("nm").source("NM", VARCHAR).build());
    }

    static ColumnCheck status() {
        return ColumnClassifier.classify(facts().target("st").source("ST", VARCHAR).codemap("status").nullFallback()
                .build());
    }

    static MappingPlan plan(String label, String where, ColumnCheck... columns) {
        return new MappingPlan(label, "legacy.orders", null, where, "public.tb_order", List.of(columns),
                List.of("order_id"), true, true, false);
    }

    static ReconciliationRun run(MappingPlan... mappings) {
        return ReconciliationRun.of(new ReconciliationPlan(true, List.of(mappings), List.of(), null, List.of(),
                List.of()), new ColumnReplay(new TransformerRegistry(), Map.of("status", STATUS)), null);
    }

    @Test
    @DisplayName("소스·where 가 같은 분할 매핑은 집계 묶음 하나를 나눠 쓰고 where 가 다르면 나뉜다")
    void splitMappingsShareAnAggregateGroup() {
        ReconciliationRun run = run(
                plan("legacy.orders#a", "kind = 'A'", amount()),
                plan("legacy.orders#b", " kind = 'A' ", name()),
                plan("legacy.orders#c", "kind = 'B'", name()));

        List<AggregateGroup> groups = new ArrayList<>(run.aggregateGroups());
        assertThat(groups).hasSize(2);
        assertThat(groups.getFirst().labels()).containsExactly("legacy.orders#a", "legacy.orders#b");
        // 문장의 컬럼은 mapping 철자다(AMT·NM) — 결과는 소문자 이름으로 찾는다.
        assertThat(groups.getFirst().query().sql()).isEqualTo("SELECT COUNT(*), COUNT(AMT), COUNT(NM), "
                + "SUM(CAST(AMT AS DECIMAL(38,0))), MIN(AMT), MAX(AMT) FROM legacy.orders WHERE kind = 'A'");
        assertThat(groups.get(1).labels()).containsExactly("legacy.orders#c");
        assertThat(ReconciliationPlan.groupKey("Legacy.Orders", " x = 'A' "))
                .isEqualTo(ReconciliationPlan.groupKey("legacy.orders", "x = 'A'"))
                .isNotEqualTo(ReconciliationPlan.groupKey("legacy.orders", "x = 'a'"));
    }

    @Test
    @DisplayName("비활성 실행은 아무것도 모으지 않는다")
    void inactiveRunCollectsNothing() {
        ReconciliationRun none = ReconciliationRun.none();
        MappingTally tally = none.table("legacy.orders");

        tally.isolated(Map.of("amt", 1), Map.of("order_id", 1));
        tally.codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, "1"))));
        tally.accepted(0, Map.of("amt", 1), "1");
        none.recordSource("g", query().parse(new Object[]{1L, 1L, 1L, 1, 1, 1}, true));
        none.replicationRole(false);

        assertThat(none.active()).isFalse();
        assertThat(tally.isolatedRows()).isZero();
        assertThat(tally.codeKinds("st")).isEmpty();
        assertThat(none.aggregateGroups()).isEmpty();
        assertThat(none.source("g")).isNull();
        assertThat(none.replicationRoleOrigin()).isNull();
        assertThat(ReconciliationRun.of(ReconciliationPlan.none(), null, null)).isSameAs(none);
    }

    @Test
    @DisplayName("격리 행의 NULL 아닌 수·합·대상 PK 를 모은다 — PK 를 찾지 못하면 키를 모른다고 남긴다")
    void isolatedContributions() {
        ReconciliationRun run = run(plan("legacy.orders", null, amount(), name()));
        MappingTally tally = run.table("LEGACY.ORDERS");

        tally.isolated(row("amt", 10, "nm", "x"), Map.of("ORDER_ID", 7L));
        tally.isolated(row("amt", null, "nm", "y"), Map.of("order_id", 8L));
        tally.isolated(row("amt", 5, "nm", null), Map.of("other", 9L));

        assertThat(tally.isolatedRows()).isEqualTo(3L);
        assertThat(tally.isolatedNonNull("amt")).isEqualTo(2L);
        assertThat(tally.isolatedNonNull("NM")).isEqualTo(2L);
        assertThat(tally.isolatedSum("amt")).isEqualByComparingTo("15");
        assertThat(tally.isolatedKeys()).containsExactly(List.of(7L), List.of(8L));
        assertThat(tally.keyUnknown()).isTrue();
    }

    @Test
    @DisplayName("합할 수 없는 격리 값이 있으면 격리 합을 모른다")
    void isolatedSumUnknown() {
        ColumnCheck rate = new ColumnCheck("rate", "rate", DOUBLE, Aggregate.NUM, true, false, null, false, null,
                null, false, null, List.of());
        MappingTally tally = run(plan("legacy.orders", null, rate)).table("legacy.orders");

        tally.isolated(row("rate", 1.5d), Map.of("order_id", 1));

        assertThat(tally.isolatedSum("rate")).isNull();
        assertThat(tally.isolatedSum("other")).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("codemap 결과 분포·종류·맞지 않은 키 위치를 센다 — NULL 결과는 분포에 넣지 않는다")
    void codeTally() {
        MappingTally tally = run(plan("legacy.orders", null, status())).table("legacy.orders");

        for (Object raw : new Object[]{"1", "1", "3", "9", null}) {
            tally.codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, raw))));
        }

        assertThat(tally.codeDistribution("ST")).containsOnly(
                Map.entry("A01", 2L), Map.entry("A03", 1L), Map.entry("9", 1L), Map.entry("Z", 1L));
        assertThat(tally.codeKinds("st")).containsOnly(Map.entry(Translation.Kind.MAPPED, 3L),
                Map.entry(Translation.Kind.PASSTHROUGH, 1L), Map.entry(Translation.Kind.NULL_FALLBACK, 1L));
        assertThat(tally.nullFallbacks("st")).isEqualTo(1L);
        assertThat(tally.unusedKeyPositions("st")).containsExactly(2);
        assertThat(tally.codeOverflow("st")).isFalse();
        assertThat(tally.toString()).doesNotContain("A01");
    }

    @Test
    @DisplayName("코드 종류가 상한을 넘으면 분포를 버리고 넘쳤다고 남긴다 — 종류 수는 계속 센다")
    void codeDistributionOverflow() {
        CodeMap passthrough = new CodeMap(Map.of("x", "X"), UnmappedPolicy.PASSTHROUGH, null);
        MappingTally tally = run(plan("legacy.orders", null, status())).table("legacy.orders");

        for (int code = 0; code <= ReconciliationRun.CODE_DISTINCT_LIMIT; code++) {
            tally.codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(passthrough, "c" + code))));
        }

        assertThat(tally.codeOverflow("st")).isTrue();
        assertThat(tally.codeDistribution("st")).isEmpty();
        assertThat(tally.codeKinds("st").get(Translation.Kind.PASSTHROUGH))
                .isEqualTo(ReconciliationRun.CODE_DISTINCT_LIMIT + 1L);
    }

    @Test
    @DisplayName("표본은 원천 행 수로 정한 등간격으로 상한까지 두고, 원천 집계가 없으면 두지 않는다")
    void sampleStrideAndLimit() {
        MappingPlan mapping = plan("legacy.orders", null, amount(), name());
        ReconciliationRun run = run(mapping);
        MappingTally tally = run.table("legacy.orders");

        tally.accepted(0, row("amt", 1, "nm", "a"), "k0");
        assertThat(tally.samples()).as("원천 집계 전").isEmpty();

        run.recordSource(mapping.aggregateGroup(), query().parse(new Object[]{1000L, 1000L, 1000L, 0, 0, 0}, true));
        for (long ordinal = 0; ordinal < 1000; ordinal++) {
            tally.accepted(ordinal, row("amt", (int) ordinal, "nm", "n" + ordinal), "k" + ordinal);
        }

        assertThat(tally.samples()).hasSize(250);
        assertThat(tally.samples()).containsKeys("k0", "k4", "k996").doesNotContainKey("k1");
        assertThat(tally.samples().get("k4")).containsOnly(Map.entry("amt", 4), Map.entry("nm", "n4"));
    }

    @Test
    @DisplayName("작은 표는 모든 행이 표본이고, 조회가 원천 행 수보다 많아도 상한(256)에서 멈춘다")
    void sampleLimit() {
        MappingPlan mapping = plan("legacy.orders", null, name());
        ReconciliationRun run = run(mapping);
        run.recordSource(mapping.aggregateGroup(), query().parse(new Object[]{256L, 0L, 0L, 0, 0, 0}, true));
        MappingTally tally = run.table("legacy.orders");

        for (long ordinal = 0; ordinal < 300; ordinal++) {
            tally.accepted(ordinal, row("nm", "n"), "k" + ordinal);
        }
        assertThat(tally.samples()).hasSize(ReconciliationRun.SAMPLE_LIMIT);

        ReconciliationRun small = run(mapping);
        small.recordSource(mapping.aggregateGroup(), query().parse(new Object[]{3L, 0L, 0L, 0, 0, 0}, true));
        for (long ordinal = 0; ordinal < 3; ordinal++) {
            small.table("legacy.orders").accepted(ordinal, row("nm", "n"), "k" + ordinal);
        }
        assertThat(small.table("legacy.orders").samples()).hasSize(3);
    }

    @Test
    @DisplayName("복제 역할은 한 번이라도 origin 이 아니면 아니다")
    void replicationRole() {
        ReconciliationRun run = run(plan("legacy.orders", null, name()));
        assertThat(run.replicationRoleOrigin()).isNull();
        run.replicationRole(true);
        assertThat(run.replicationRoleOrigin()).isTrue();
        run.replicationRole(false);
        run.replicationRole(true);
        assertThat(run.replicationRoleOrigin()).isFalse();
    }

    @Test
    @DisplayName("계획에 없는 라벨의 대상 누적은 만들지 않고, 활성 계획에는 재계산이 있어야 한다")
    void guards() {
        ReconciliationRun run = run(plan("legacy.orders", null, name()));
        assertThatThrownBy(() -> run.targetTally("legacy.other")).isInstanceOf(IllegalArgumentException.class);
        assertThat(run.table("legacy.other").isolatedRows()).isZero();
        assertThatThrownBy(() -> ReconciliationRun.of(new ReconciliationPlan(true, List.of(), List.of(), null,
                List.of(), List.of()), null, null)).isInstanceOf(NullPointerException.class);
        assertThat(run.toString()).isEqualTo("ReconciliationRun[active]");
    }

    /** amt(NUM)·nm 묶음의 집계 문장. */
    static SourceAggregateQuery query() {
        return SourceAggregateQuery.of("legacy.orders", null, List.of(
                SourceAggregateQuery.AggregateColumn.of(amount()),
                SourceAggregateQuery.AggregateColumn.of(name())));
    }

    static Map<String, Object> row(Object... pairs) {
        Map<String, Object> row = new HashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            row.put((String) pairs[i], pairs[i + 1]);
        }
        return row;
    }

    static Map<String, String> ordered(String... pairs) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
