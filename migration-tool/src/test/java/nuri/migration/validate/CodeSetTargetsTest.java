package nuri.migration.validate;

import nuri.migration.model.MappingSpec;
import nuri.migration.validate.CodeSetPrecheck.ColumnKey;
import nuri.migration.validate.CodeSetPrecheck.PrecheckResult;
import nuri.migration.validate.CodeSetTarget.Source;
import nuri.migration.validate.ProductCodeBindings.Use;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedger.NonStandardTarget;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import nuri.migration.validate.ledger.TermLedgerValidator.TermKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static nuri.migration.validate.CodeSetPrecheckTest.column;
import static nuri.migration.validate.CodeSetPrecheckTest.spec;
import static nuri.migration.validate.CodeSetPrecheckTest.table;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D7] 공통코드·허용값 대사 대상 — 제품 바인딩, 읽을 수 있는 메타 허용값, 대조할 원천이 없는 코드 컬럼
 * (사용자 결정 L4-P2: 원천이 있으면 FAIL 원천, 없으면 서명 대상).
 */
@DisplayName("공통코드 대사 대상")
class CodeSetTargetsTest {

    private static final StandardTerm STATUS_CODE = new StandardTerm("상태코드", "STTS_CD", "코드C2");
    private static final StandardTerm TYPE_CODE = new StandardTerm("유형코드", "TY_CD", "코드C3");
    private static final StandardTerm USE_YN = new StandardTerm("사용여부", "USE_YN", "여부C1");
    private static final StandardTerm TITLE = new StandardTerm("제목", "TTL", "명V200");
    private static final Map<TermKey, StandardTermRecord> TERMS = Map.of(
            new TermKey("public", "STTS_CD"), new StandardTermRecord("상태코드", "코드C2", false, "01 : 접수, 02 : 처리"),
            new TermKey("public", "TY_CD"), new StandardTermRecord("유형코드", "코드C3", false, "01 : 일반, 02 : …"),
            new TermKey("public", "USE_YN"), new StandardTermRecord("사용여부", "여부C1", false, "Y : 예, N : 아니오"));

    @Test
    @DisplayName("바인딩 컬럼은 쓰임과 함께 COMMON_CODE 가 되고, 게이트의 보류·그룹 부재를 옮긴다")
    void commonCodeBindings() {
        MappingSpec mapping = spec(Map.of(),
                table("tb_ifml_atrz_info", column("TASK", "task_se_cd", null, null), column("T", "title", null, null)),
                table("PUBLIC.TB_SYS_LOG", column("P", "PRCS_SE_CD", null, null)),
                table("public.tb_bbs_master", column("TY", "bbs_type_cd", null, null)));
        PrecheckResult precheck = new PrecheckResult(List.of(), Set.of("public"),
                Set.of(new ColumnKey("public.tb_bbs_master", "bbs_type_cd")));

        List<CodeSetTarget> targets = CodeSetTargets.of(mapping, null, Map.of(), "public", ProductCodeBindings.ALL,
                precheck);

        assertThat(targets).extracting(CodeSetTarget::table, CodeSetTarget::column, CodeSetTarget::source,
                CodeSetTarget::group, CodeSetTarget::use, CodeSetTarget::trim).containsExactly(
                org.assertj.core.groups.Tuple.tuple("public.tb_ifml_atrz_info", "task_se_cd", Source.COMMON_CODE,
                        "COM075", Use.VALIDATE, false),
                org.assertj.core.groups.Tuple.tuple("public.tb_sys_log", "prcs_se_cd", Source.COMMON_CODE, "COM033",
                        Use.DISPLAY, true),
                org.assertj.core.groups.Tuple.tuple("public.tb_bbs_master", "bbs_type_cd", Source.COMMON_CODE, "COM004",
                        Use.DISPLAY, false));
        assertThat(targets).allSatisfy(target -> assertThat(target.deferred()).isTrue());
        assertThat(targets).extracting(CodeSetTarget::groupAbsent).containsExactly(false, false, true);
        assertThat(targets).extracting(CodeSetTarget::failSource).containsExactly(true, false, false);
        assertThat(CodeSetTargets.of(mapping, null, null, "public", ProductCodeBindings.ALL, null))
                .extracting(CodeSetTarget::deferred).containsOnly(false);
    }

    @Test
    @DisplayName("코드 용어의 메타 허용값을 읽을 수 있으면 ALLOWED_VALUES 고, 읽을 수 없으면 UNRECONCILED 다")
    void allowedValuesOrUnreconciled() {
        MappingSpec mapping = spec(Map.of(), table("public.tb_req",
                column("S", "stts_cd", null, null), column("K", "ty_cd", null, null), column("U", "use_yn", null, null),
                column("N", "ttl", null, null)));
        TermLedger ledger = ledger(
                confirmed("L-1", "public.tb_req", "stts_cd", STATUS_CODE),
                confirmed("L-2", "tb_req", "ty_cd", TYPE_CODE),
                confirmed("L-3", "public.tb_req", "use_yn", USE_YN),
                confirmed("L-4", "public.tb_req", "ttl", TITLE));

        List<CodeSetTarget> targets = CodeSetTargets.of(mapping, ledger, TERMS, "public", ProductCodeBindings.ALL,
                PrecheckResult.empty());

        assertThat(targets).extracting(CodeSetTarget::column, CodeSetTarget::source, CodeSetTarget::ledgerEntry)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("stts_cd", Source.ALLOWED_VALUES, "L-1"),
                        org.assertj.core.groups.Tuple.tuple("ty_cd", Source.UNRECONCILED, "L-2"));
        assertThat(targets.getFirst().allowed()).containsExactly("01", "02");
        assertThat(targets.getFirst().failSource()).isTrue();
        assertThat(targets.get(1).failSource()).isFalse();
        // live 용어가 없거나 허용값이 없으면 읽을 수 없는 것이다.
        assertThat(CodeSetTargets.of(mapping, ledger, Map.of(), "public", ProductCodeBindings.ALL, null))
                .extracting(CodeSetTarget::column, CodeSetTarget::source).containsExactly(
                        org.assertj.core.groups.Tuple.tuple("stts_cd", Source.UNRECONCILED),
                        org.assertj.core.groups.Tuple.tuple("ty_cd", Source.UNRECONCILED));
        // 허용값 집합은 문자열로 내지 않는다.
        assertThat(targets.getFirst().toString()).isEqualTo("CodeSetTarget[public.tb_req.stts_cd, ALLOWED_VALUES]")
                .doesNotContain("01");
    }

    @Test
    @DisplayName("비표준 대상(U1)은 codemap 을 쓰거나 이름이 _cd 로 끝나면 UNRECONCILED 다")
    void nonStandardCodeColumns() {
        MappingSpec mapping = spec(Map.of(), table("public.tb_req",
                column("A", "kind_cd", null, null), column("B", "grade", "grade", null), column("C", "memo", null, null),
                column("D", "Etc_CD", null, null)));
        TermLedger ledger = ledger(
                nonStandard("N-1", "kind_cd", null),
                nonStandard("N-2", "grade", "grade"),
                nonStandard("N-3", "memo", null),
                nonStandard("N-4", "Etc_CD", null),
                withStatus(nonStandard("N-5", "memo", "memo"), "REVIEWED"));

        List<CodeSetTarget> targets = CodeSetTargets.of(mapping, ledger, TERMS, "public", ProductCodeBindings.ALL,
                PrecheckResult.empty());

        assertThat(targets).extracting(CodeSetTarget::column, CodeSetTarget::source, CodeSetTarget::ledgerEntry)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("kind_cd", Source.UNRECONCILED, "N-1"),
                        org.assertj.core.groups.Tuple.tuple("grade", Source.UNRECONCILED, "N-2"),
                        org.assertj.core.groups.Tuple.tuple("etc_cd", Source.UNRECONCILED, "N-4"));
    }

    @Test
    @DisplayName("쓰기 검증 바인딩과 메타 허용값이 함께 있으면 둘 다 대상이고, 실패 원천이 있으면 UNRECONCILED 가 아니다")
    void bothFailSources() {
        MappingSpec mapping = spec(Map.of(), table("public.tb_ifml_atrz_info", column("T", "task_se_cd", "task", null)));
        StandardTerm taskTerm = new StandardTerm("업무구분코드", "TASK_SE_CD", "코드C2");
        Map<TermKey, StandardTermRecord> terms = Map.of(new TermKey("public", "TASK_SE_CD"),
                new StandardTermRecord("업무구분코드", "코드C2", false, "A1 : 가, A2 : 나"));

        List<CodeSetTarget> both = CodeSetTargets.of(mapping, ledger(confirmed("T-1", "public.tb_ifml_atrz_info",
                "task_se_cd", taskTerm)), terms, "public", ProductCodeBindings.ALL, PrecheckResult.empty());
        List<CodeSetTarget> validateOnly = CodeSetTargets.of(mapping, ledger(nonStandard("T-2", "public.tb_ifml_atrz_info",
                "task_se_cd", "task")), terms, "public", ProductCodeBindings.ALL, PrecheckResult.empty());

        assertThat(both).extracting(CodeSetTarget::source).containsExactly(Source.COMMON_CODE, Source.ALLOWED_VALUES);
        assertThat(validateOnly).extracting(CodeSetTarget::source).containsExactly(Source.COMMON_CODE);
    }

    @Test
    @DisplayName("표시 바인딩은 실패 원천이 아니므로 그 컬럼의 U1·U3 확정은 서명 대상으로 남는다(L4-P2)")
    void displayBindingIsNotAFailSource() {
        MappingSpec mapping = spec(Map.of(), table("public.tb_bbs_master", column("TY", "bbs_type_cd", "ty", null)),
                table("public.tb_ifml_atrz_hstry", column("TASK", "task_se_cd", null, null)));
        TermLedger ledger = ledger(nonStandard("B-1", "public.tb_bbs_master", "bbs_type_cd", "ty"),
                confirmed("H-1", "public.tb_ifml_atrz_hstry", "task_se_cd", TYPE_CODE));

        List<CodeSetTarget> targets = CodeSetTargets.of(mapping, ledger, TERMS, "public", ProductCodeBindings.ALL,
                PrecheckResult.empty());

        assertThat(targets).extracting(CodeSetTarget::column, CodeSetTarget::source, CodeSetTarget::use)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("bbs_type_cd", Source.COMMON_CODE, Use.DISPLAY),
                        org.assertj.core.groups.Tuple.tuple("bbs_type_cd", Source.UNRECONCILED, null),
                        org.assertj.core.groups.Tuple.tuple("task_se_cd", Source.COMMON_CODE, Use.DISPLAY),
                        org.assertj.core.groups.Tuple.tuple("task_se_cd", Source.UNRECONCILED, null));
    }

    @Test
    @DisplayName("원장이 없으면 바인딩만 보고, 여러 매핑이 쓰는 대상 컬럼은 한 번만 센다")
    void bindingsOnlyAndDeduplicated() {
        MappingSpec mapping = spec(Map.of(),
                table("public.tb_ifml_atrz_info", column("A", "task_se_cd", "a", null)),
                table("PUBLIC.tb_ifml_atrz_info", column("B", "TASK_SE_CD", "b", null)),
                table("app.tb_ifml_atrz_info", column("C", "task_se_cd", "c", null)));

        List<CodeSetTarget> targets = CodeSetTargets.of(mapping, null, null, "public", ProductCodeBindings.ALL, null);

        assertThat(targets).extracting(CodeSetTarget::table)
                .containsExactly("public.tb_ifml_atrz_info", "app.tb_ifml_atrz_info");
        // 원장의 대상 표 표기(schema 생략)도 기본 schema 로 맞춘다. 표준 용어의 schema 는 원장 검증처럼 쓴 그대로 찾는다.
        List<CodeSetTarget> app = CodeSetTargets.of(spec(Map.of(), table("app.tb_req", column("S", "stts_cd", null,
                null))), ledger(confirmed("A-1", "tb_req", "stts_cd", STATUS_CODE)), Map.of(new TermKey("app",
                "STTS_CD"), new StandardTermRecord("상태코드", "코드C2", false, "01 : 접수")), "app",
                ProductCodeBindings.ALL, null);
        assertThat(app).singleElement().satisfies(target -> {
            assertThat(target.source()).isEqualTo(Source.ALLOWED_VALUES);
            assertThat(target.table()).isEqualTo("app.tb_req");
        });
    }

    @Test
    @DisplayName("대상은 원천마다 필요한 값을 갖고 이름을 소문자로 맞춘다")
    void targetShape() {
        assertThatThrownBy(() -> new CodeSetTarget(" ", "c", Source.UNRECONCILED, null, null, false, null, "L", false,
                false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CodeSetTarget("t", "c", Source.COMMON_CODE, "COM001", null, false, null, null,
                false, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CodeSetTarget("t", "c", Source.COMMON_CODE, " ", Use.DISPLAY, false, null, null,
                false, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CodeSetTarget.allowedValues("t", "c", Set.of(), "L"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CodeSetTarget.allowedValues("t", "c", Set.of("A"), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CodeSetTarget.unreconciled("t", "c", null))
                .isInstanceOf(IllegalArgumentException.class);
        CodeSetTarget target = CodeSetTarget.unreconciled(" Public.TB_A ", " X_CD ", "L");
        assertThat(target.table()).isEqualTo("public.tb_a");
        assertThat(target.column()).isEqualTo("x_cd");
        assertThat(target.allowed()).isEmpty();
        assertThat(target.toString()).isEqualTo("CodeSetTarget[public.tb_a.x_cd, UNRECONCILED]");
    }

    private static TermLedger ledger(Entry... entries) {
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, new ArrayList<>(Arrays.asList(entries)));
    }

    private static Entry confirmed(String id, String table, String column, StandardTerm term) {
        return new Entry(id, new ColumnRef("legacy.src", column.toUpperCase()), null, null, new ColumnRef(table, column),
                term, null, "EXACT", "CONFIRMED", new Load(null, null, null, null),
                new Conformance(BigDecimal.valueOf(100), List.of(), null, List.of(), null), null, null, List.of());
    }

    private static Entry nonStandard(String id, String column, String codemap) {
        return nonStandard(id, "public.tb_req", column, codemap);
    }

    private static Entry nonStandard(String id, String table, String column, String codemap) {
        return new Entry(id, new ColumnRef("legacy.src", column.toUpperCase()), null, null, new ColumnRef(table, column),
                null, new NonStandardTarget("표준 용어 없음"), "UNKNOWN", "CONFIRMED",
                new Load(null, null, codemap, null), null, null, null, List.of());
    }

    private static Entry withStatus(Entry entry, String status) {
        return new Entry(entry.id(), entry.source(), entry.mapping(), entry.via(), entry.target(), entry.term(),
                entry.nonStandardTarget(), entry.grade(), status, entry.load(), entry.conformance(), entry.archive(),
                entry.note(), entry.history());
    }
}
