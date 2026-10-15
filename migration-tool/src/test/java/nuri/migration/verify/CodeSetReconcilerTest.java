package nuri.migration.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.CodeTranslator.Translation;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.validate.CodeSetTarget.Source;
import nuri.migration.validate.ProductCodeBindings;
import nuri.migration.validate.ProductCodeBindings.Use;
import nuri.migration.verify.CodeSetReconciler.CodeSetVerdict;
import nuri.migration.verify.CodeSetReconciler.Status;
import nuri.migration.verify.CodeSetReconciler.TableQuery;
import nuri.migration.verify.ReconciliationEvidence.CodeSetRecord;
import nuri.migration.verify.ReconciliationEvidence.CodemapUseRecord;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.CodeHit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static nuri.migration.verify.ReconciliationRunTest.STATUS;
import static nuri.migration.verify.ReconciliationRunTest.status;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D7] 적재 뒤 공통코드·허용값 대사 — 표마다 문장 하나, 쓰기 검증 FAIL·표시 기록·허용값 FAIL·원천 없는 컬럼의
 * 서명 대상(L4-P2), 질의 실패, codemap 사용 집계. 문장·판정·증거에 코드값이 없다.
 */
@DisplayName("공통코드 대사")
class CodeSetReconcilerTest {

    private static final String PROBE = "PV4D2";

    private static final CodeSetTarget VALIDATE = CodeSetTarget.commonCode("public.tb_ifml_atrz_info", "task_se_cd",
            ProductCodeBindings.ALL.getFirst(), false, false);
    private static final CodeSetTarget LOG = CodeSetTarget.commonCode("public.tb_sys_log", "prcs_se_cd",
            ProductCodeBindings.ALL.get(5), false, false);
    private static final CodeSetTarget HISTORY = CodeSetTarget.commonCode("public.tb_ifml_atrz_hstry", "task_se_cd",
            ProductCodeBindings.ALL.get(2), false, true);
    private static final CodeSetTarget ALLOWED = CodeSetTarget.allowedValues("public.tb_ifml_atrz_info", "stts_cd",
            Set.of("02", PROBE), "L-1");
    private static final CodeSetTarget UNRECONCILED = CodeSetTarget.unreconciled("public.tb_ifml_atrz_info", "kind_cd",
            "L-2");

    @Test
    @DisplayName("같은 표의 대상은 문장 하나로 세고, trim 바인딩은 공백을 지운 값으로 세며 인자는 바인딩만 한다")
    void oneStatementPerTable() {
        List<TableQuery> queries = CodeSetReconciler.queries(List.of(VALIDATE, LOG, ALLOWED, UNRECONCILED));

        assertThat(queries).hasSize(2);
        TableQuery approval = queries.getFirst();
        assertThat(approval.table()).isEqualTo("public.tb_ifml_atrz_info");
        assertThat(approval.targets()).containsExactly(0, 2, 3);
        assertThat(approval.sql()).isEqualTo("SELECT count(task_se_cd) AS nn_0, "
                + "count(*) FILTER (WHERE task_se_cd IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tb_com_dtl_cd d"
                + " WHERE d.cd_id = ? AND d.dtl_cd = task_se_cd)) AS missing_0, "
                + "count(DISTINCT task_se_cd) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.tb_com_dtl_cd d"
                + " WHERE d.cd_id = ? AND d.dtl_cd = task_se_cd)) AS missing_distinct_0, "
                + "count(*) FILTER (WHERE task_se_cd IS NOT NULL AND EXISTS (SELECT 1 FROM public.tb_com_dtl_cd d"
                + " WHERE d.cd_id = ? AND d.dtl_cd = task_se_cd AND d.use_yn IS DISTINCT FROM 'Y')) AS inactive_0, "
                + "count(stts_cd) AS nn_2, count(*) FILTER (WHERE stts_cd IS NOT NULL AND NOT (stts_cd = ANY (?)))"
                + " AS outside_2, count(kind_cd) AS nn_3, count(DISTINCT kind_cd) AS distinct_3"
                + " FROM public.tb_ifml_atrz_info");
        assertThat(approval.args()).containsExactly("COM075", "COM075", "COM075", List.of("02", PROBE));
        assertThat(queries.get(1).sql()).startsWith("SELECT count(trim(prcs_se_cd)) AS nn_1, ")
                .contains("d.dtl_cd = trim(prcs_se_cd)", "count(DISTINCT trim(prcs_se_cd))")
                .endsWith(" FROM public.tb_sys_log");
        assertThat(queries.get(1).args()).containsExactly("COM033", "COM033", "COM033");
        assertThat(String.join(" ", queries.stream().map(TableQuery::sql).toList())).doesNotContain(PROBE);
        assertThat(approval.toString()).isEqualTo("TableQuery[public.tb_ifml_atrz_info, targets=3]");
        assertThat(CodeSetReconciler.queries(List.of())).isEmpty();
        // 공통코드 표는 대상 표의 schema 에서 찾는다. schema 가 없으면 기본 schema 다.
        assertThat(CodeSetReconciler.queries(List.of(new CodeSetTarget("app.tb_x", "x_cd", Source.COMMON_CODE,
                "COM001", Use.DISPLAY, false, null, null, false, false))).getFirst().sql())
                .contains("FROM app.tb_com_dtl_cd d").doesNotContain("public.").endsWith(" FROM app.tb_x");
        assertThat(CodeSetReconciler.queries(List.of(new CodeSetTarget("tb_x", "x_cd", Source.COMMON_CODE,
                "COM001", Use.DISPLAY, false, null, null, false, false))).getFirst().sql())
                .contains("FROM public.tb_com_dtl_cd d").endsWith(" FROM tb_x");
        assertThatThrownBy(() -> CodeSetReconciler.queries(List.of(CodeSetTarget.unreconciled("public.tb_x",
                "x;drop", "L")))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("쓰기 검증은 없는 코드·사용 안 함 코드가 있으면 FAIL, 표시는 기록, 허용값은 밖이 있으면 FAIL, 원천 없는 컬럼은 서명 대상")
    void verdictMatrix() {
        List<CodeSetTarget> targets = List.of(VALIDATE, VALIDATE, VALIDATE, HISTORY, ALLOWED, ALLOWED, UNRECONCILED);
        Map<String, Long> counts = new HashMap<>();
        common(counts, 0, 10, 2, 1, 1);
        common(counts, 1, 10, 0, 0, 3);
        common(counts, 2, 10, 0, 0, 0);
        common(counts, 3, 8, 8, 2, 0);
        counts.put("nn_4", 5L);
        counts.put("outside_4", 4L);
        counts.put("nn_5", 5L);
        counts.put("outside_5", 0L);
        counts.put("nn_6", 9L);
        counts.put("distinct_6", 3L);

        List<CodeSetVerdict> verdicts = CodeSetReconciler.judge(targets, counts, Map.of());

        assertThat(verdicts).extracting(CodeSetVerdict::status, CodeSetVerdict::reason).containsExactly(
                org.assertj.core.groups.Tuple.tuple(Status.FAIL, CodeSetReconciler.CODE_MISSING),
                org.assertj.core.groups.Tuple.tuple(Status.FAIL, CodeSetReconciler.CODE_INACTIVE),
                org.assertj.core.groups.Tuple.tuple(Status.PASS, null),
                org.assertj.core.groups.Tuple.tuple(Status.RECORDED, null),
                org.assertj.core.groups.Tuple.tuple(Status.FAIL, CodeSetReconciler.CODE_OUTSIDE_ALLOWED),
                org.assertj.core.groups.Tuple.tuple(Status.PASS, null),
                org.assertj.core.groups.Tuple.tuple(Status.UNRECONCILED, null));
        assertThat(verdicts).extracting(CodeSetVerdict::failed)
                .containsExactly(true, true, false, false, true, false, false);
        assertThat(verdicts.getFirst()).extracting(CodeSetVerdict::nonNull, CodeSetVerdict::missing,
                CodeSetVerdict::missingDistinct, CodeSetVerdict::inactive).containsExactly(10L, 2L, 1L, 1L);
        assertThat(verdicts.get(4).outside()).isEqualTo(4L);
        assertThat(verdicts.get(6)).extracting(CodeSetVerdict::nonNull, CodeSetVerdict::distinct)
                .containsExactly(9L, 3L);

        assertThat(CodeSetReconciler.failureNote(verdicts.getFirst())).isEqualTo("공통코드 대사 불일치("
                + "public.tb_ifml_atrz_info.task_se_cd, source=COMMON_CODE(COM075)): CODE_MISSING 2건");
        assertThat(CodeSetReconciler.failureNote(verdicts.get(1))).endsWith("): CODE_INACTIVE 3건");
        assertThat(CodeSetReconciler.failureNote(verdicts.get(4))).isEqualTo("공통코드 대사 불일치("
                + "public.tb_ifml_atrz_info.stts_cd, source=ALLOWED_VALUES): CODE_OUTSIDE_ALLOWED 4건");
        assertThat(CodeSetReconciler.failureNote(verdicts.get(2))).isNull();
        assertThat(CodeSetReconciler.failureNote(verdicts.get(3))).isNull();
        assertThat(CodeSetReconciler.failureNote(null)).isNull();
    }

    @Test
    @DisplayName("질의가 실패하면 실패 원천은 FAIL, 표시는 기록, 원천 없는 컬럼은 서명 대상이고 SQLSTATE 만 남는다")
    void queryFailures() {
        List<CodeSetTarget> targets = List.of(VALIDATE, ALLOWED, UNRECONCILED, LOG, HISTORY);
        FakeQueries queries = new FakeQueries();
        queries.fail("public.tb_ifml_atrz_info", "42P01");
        queries.fail("public.tb_sys_log", null);
        Map<String, Long> history = new HashMap<>();
        common(history, 4, 3, 0, 0, 0);
        queries.answer("public.tb_ifml_atrz_hstry", history);

        List<CodeSetVerdict> verdicts = CodeSetReconciler.reconcile(targets, queries);

        assertThat(queries.statements).hasSize(3);
        assertThat(verdicts).extracting(CodeSetVerdict::status, CodeSetVerdict::reason).containsExactly(
                org.assertj.core.groups.Tuple.tuple(Status.FAIL, "CODE_SET_QUERY_FAILED(SQLSTATE=42P01)"),
                org.assertj.core.groups.Tuple.tuple(Status.FAIL, "CODE_SET_QUERY_FAILED(SQLSTATE=42P01)"),
                org.assertj.core.groups.Tuple.tuple(Status.UNRECONCILED, "CODE_SET_QUERY_FAILED(SQLSTATE=42P01)"),
                org.assertj.core.groups.Tuple.tuple(Status.RECORDED, "CODE_SET_QUERY_FAILED(SQLSTATE=unknown)"),
                org.assertj.core.groups.Tuple.tuple(Status.RECORDED, null));
        assertThat(verdicts.getFirst().nonNull()).isNull();
        assertThat(CodeSetReconciler.failureNote(verdicts.getFirst())).isEqualTo("공통코드 대사 불일치("
                + "public.tb_ifml_atrz_info.task_se_cd, source=COMMON_CODE(COM075)): CODE_SET_QUERY_FAILED(SQLSTATE=42P01)");
        assertThatThrownBy(() -> CodeSetReconciler.reconcile(targets, null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("질의는 성공했는데 건수가 빠졌으면 질의 실패로 본다")
    void missingCountsAreFailures() {
        List<CodeSetTarget> targets = List.of(VALIDATE, VALIDATE, ALLOWED, UNRECONCILED);
        Map<String, Long> counts = new HashMap<>();
        counts.put("nn_1", 1L);
        counts.put("missing_1", 0L);
        counts.put("missing_distinct_1", 0L);
        counts.put("nn_2", 1L);
        counts.put("nn_3", 1L);

        List<CodeSetVerdict> verdicts = CodeSetReconciler.judge(targets, counts, Map.of());

        assertThat(verdicts).extracting(CodeSetVerdict::status).containsExactly(Status.FAIL, Status.FAIL, Status.FAIL,
                Status.UNRECONCILED);
        assertThat(verdicts).extracting(CodeSetVerdict::reason)
                .containsOnly("CODE_SET_QUERY_FAILED(SQLSTATE=unknown)");
    }

    @Test
    @DisplayName("증거 기록은 원천·쓰임·원장 행과 건수만 싣고 허용값·코드값은 싣지 않는다")
    void evidenceHasNoValues() throws Exception {
        Map<String, Long> counts = new HashMap<>();
        common(counts, 0, 3, 0, 0, 0);
        counts.put("nn_1", 2L);
        counts.put("outside_1", 1L);
        List<CodeSetVerdict> verdicts = CodeSetReconciler.judge(List.of(HISTORY, ALLOWED), counts, Map.of());

        List<CodeSetRecord> records = verdicts.stream().map(CodeSetRecord::of).toList();
        String json = new ObjectMapper().writeValueAsString(new ReconciliationEvidence("NOT_CHECKED", null, null, null,
                null, records, null));

        assertThat(records.getFirst()).isEqualTo(new CodeSetRecord("public.tb_ifml_atrz_hstry", "task_se_cd",
                "COMMON_CODE", "COM075", "DISPLAY", null, 3L, 0L, 0L, 0L, null, null, true, false, "RECORDED", null));
        assertThat(json).contains("\"codeSets\":[", "\"source\":\"ALLOWED_VALUES\"", "\"ledgerEntry\":\"L-1\"",
                "\"outsideRows\":1", "\"status\":\"FAIL\"", "\"reason\":\"CODE_OUTSIDE_ALLOWED\"")
                .doesNotContain(PROBE, "\"02\"", "\"distinct\"", "codemapUse");
    }

    @Test
    @DisplayName("codemap 사용은 (대상, 컬럼, codemap)마다 종류 행 수를 더하고, 어느 매핑에서도 맞지 않은 키 위치만 남긴다")
    void codemapUse() {
        MappingPlan first = new MappingPlan("legacy.orders#a", "legacy.orders", "a", "kind = 'A'", "public.tb_order",
                List.of(status(), ReconciliationRunTest.name()), List.of("order_id"), true, false, false);
        MappingPlan second = new MappingPlan("legacy.orders#b", "legacy.orders", "b", "kind = 'B'", "PUBLIC.TB_ORDER",
                List.of(status()), List.of("order_id"), true, false, false);
        MappingPlan idle = new MappingPlan("legacy.other", "legacy.other", null, null, "public.tb_other",
                List.of(status()), List.of("other_id"), true, false, false);
        ReconciliationRun run = ReconciliationRun.of(new ReconciliationPlan(true, List.of(first, second, idle), List.of(),
                null, List.of(), List.of()), new ColumnReplay(new TransformerRegistry(), Map.of("status", STATUS)), null);
        for (Object raw : new Object[]{"1", "1", "9", null}) {
            run.table("legacy.orders#a").codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, raw))));
        }
        for (Object raw : new Object[]{"2", "8"}) {
            run.table("legacy.orders#b").codes(List.of(new CodeHit("st", "status", CodeTranslator.translate(STATUS, raw))));
        }
        run.table("legacy.orders#b").codes(List.of(new CodeHit("st", "status",
                new Translation("Z", Translation.Kind.FALLBACK, null))));

        List<CodemapUseRecord> uses = CodeSetReconciler.codemapUse(run);

        assertThat(uses).containsExactly(
                new CodemapUseRecord("public.tb_order", "st", "status", 3, 2, 1, 1, List.of(3)),
                new CodemapUseRecord("public.tb_other", "st", "status", 0, 0, 0, 0, List.of(1, 2, 3)));
        assertThat(CodeSetReconciler.codemapUse(ReconciliationRun.none())).isEmpty();
        assertThat(new CodemapUseRecord("t", "c", "m", 0, 0, 0, 0, null).unusedKeyPositions()).isEmpty();
    }

    @Test
    @DisplayName("사용 안 함 코드는 쓰기 검증 대상만 FAIL 이고 표시 대상은 같은 건수여도 기록만 한다")
    void inactiveOnlyFailsValidate() {
        Map<String, Long> counts = new HashMap<>();
        common(counts, 0, 4, 0, 0, 2);
        common(counts, 1, 4, 0, 0, 2);

        List<CodeSetVerdict> verdicts = CodeSetReconciler.judge(List.of(VALIDATE, HISTORY), counts, Map.of());

        assertThat(verdicts).extracting(CodeSetVerdict::status).containsExactly(Status.FAIL, Status.RECORDED);
        assertThat(VALIDATE.use()).isEqualTo(Use.VALIDATE);
        assertThat(HISTORY.use()).isEqualTo(Use.DISPLAY);
        assertThat(UNRECONCILED.source()).isEqualTo(Source.UNRECONCILED);
    }

    private static void common(Map<String, Long> counts, int index, long nonNull, long missing, long missingDistinct,
                               long inactive) {
        counts.put("nn_" + index, nonNull);
        counts.put("missing_" + index, missing);
        counts.put("missing_distinct_" + index, missingDistinct);
        counts.put("inactive_" + index, inactive);
    }

    /** 표 이름을 FROM 절로 알아보고 미리 정한 건수나 실패를 돌려준다. */
    private static final class FakeQueries implements TargetReconciliationQueries {
        private final Map<String, Map<String, Long>> answers = new HashMap<>();
        private final Map<String, String> failures = new HashMap<>();
        private final List<String> statements = new ArrayList<>();

        void answer(String table, Map<String, Long> counts) {
            answers.put(table, counts);
        }

        void fail(String table, String sqlState) {
            failures.put(table, sqlState);
        }

        @Override
        public long count(String sql, List<Object> args) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Map<String, Long> counts(String sql, List<Object> args) {
            statements.add(sql);
            String table = sql.substring(sql.lastIndexOf(" FROM ") + " FROM ".length());
            if (failures.containsKey(table)) {
                throw new ReconciliationQueryException(failures.get(table));
            }
            return answers.getOrDefault(table, Map.of());
        }

        @Override
        public TargetConstraintSnapshot constraints(List<TableMetadata> tables) {
            throw new UnsupportedOperationException();
        }
    }
}
