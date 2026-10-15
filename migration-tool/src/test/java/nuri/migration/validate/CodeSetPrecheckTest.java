package nuri.migration.validate;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.validate.CodeSetPrecheck.ColumnKey;
import nuri.migration.validate.CodeSetPrecheck.PrecheckResult;
import nuri.migration.validate.ProductCodeBindings.Binding;
import nuri.migration.validate.ProductCodeBindings.Use;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D7] 공통코드 바인딩의 쓰기 전 게이트 — 그룹 헤더 부재, 쓰기 검증 컬럼의 codemap·상수 필수, 출력의 사용 중
 * 상세코드 포함, 공통코드 표를 함께 적재할 때의 보류. 문구에는 코드값이 없다.
 */
@DisplayName("공통코드 쓰기 전 게이트")
class CodeSetPrecheckTest {

    /** 문구에 나오면 안 되는 탐침 코드. */
    private static final String PROBE_ACTIVE = "PA7F3";
    private static final String PROBE_INACTIVE = "PI9C1";
    private static final String PROBE_UNKNOWN = "PX2B8";

    private static final CodeGroupState COM075 = new CodeGroupState(true, Set.of(PROBE_ACTIVE, "A03"),
            Set.of(PROBE_INACTIVE));

    @Test
    @DisplayName("바인딩 카탈로그는 여섯 행이고 쓰기 검증은 결재 본표의 업무 구분 하나다")
    void catalog() {
        assertThat(ProductCodeBindings.ALL).hasSize(6);
        assertThat(ProductCodeBindings.ALL).filteredOn(binding -> binding.use() == Use.VALIDATE)
                .singleElement().satisfies(binding -> {
                    assertThat(binding.table()).isEqualTo("tb_ifml_atrz_info");
                    assertThat(binding.column()).isEqualTo("task_se_cd");
                    assertThat(binding.group()).isEqualTo("COM075");
                });
        assertThat(ProductCodeBindings.of("PUBLIC.TB_SYS_LOG", " Prcs_Se_Cd ")).singleElement()
                .satisfies(binding -> assertThat(binding.trim()).isTrue());
        assertThat(ProductCodeBindings.of("tb_bbs_master", "bbs_atrb_cd")).extracting(Binding::group)
                .containsExactly("COM009");
        assertThat(ProductCodeBindings.of("public.tb_bbs_master", "bbs_nm")).isEmpty();
        assertThat(ProductCodeBindings.of("public.tb_ifml_atrz_info_x", "task_se_cd")).isEmpty();
        assertThat(ProductCodeBindings.of(null, "task_se_cd")).isEmpty();
        assertThat(ProductCodeBindings.of("tb_sys_log", " ")).isEmpty();
        assertThatThrownBy(() -> new Binding("tb_x", "x_cd", " ", Use.DISPLAY, false))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Binding(" ", "x_cd", "COM001", Use.DISPLAY, false))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Binding("tb_x", null, "COM001", Use.DISPLAY, false))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Binding("tb_x", "x_cd", "COM001", null, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("쓰기 검증 그룹 헤더가 없으면 멈추고, 표시 그룹은 통과해 groupAbsent 로 넘긴다")
    void groupHeaderAbsent() {
        MappingSpec spec = spec(Map.of("task", codemap(PROBE_ACTIVE)),
                table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null)),
                table("public.tb_ifml_atrz_hstry", column("TASK", "task_se_cd", "task", null)));

        PrecheckResult result = check(spec, Map.of("COM075", CodeGroupState.absent()));

        assertThat(result.errors()).singleElement().asString()
                .startsWith("public.tb_ifml_atrz_info.task_se_cd: ")
                .contains("공통코드 그룹(COM075)이 대상에 없습니다(CODE_GROUP_ABSENT)", "DEC-OPS-262");
        assertThat(result.passed()).isFalse();
        assertThat(result.groupAbsent()).containsExactly(new ColumnKey("public.tb_ifml_atrz_hstry", "task_se_cd"));
        assertThat(result.groupAbsent("PUBLIC.TB_IFML_ATRZ_HSTRY", "TASK_SE_CD")).isTrue();
        assertThat(result.groupAbsent("public.tb_ifml_atrz_info", "task_se_cd")).isFalse();
        assertThat(result.groupAbsent(null, "task_se_cd")).isFalse();
        // 읽기 결과에 그룹이 빠졌으면 헤더가 없는 것으로 본다.
        assertThat(CodeSetPrecheck.check(spec, ProductCodeBindings.ALL, Map.of(), "public").errors())
                .singleElement().asString().contains("CODE_GROUP_ABSENT");
    }

    @Test
    @DisplayName("쓰기 검증 컬럼을 codemap 없이(원장 U1·U3 확정 모두) 옮기거나 미매핑을 그대로 쓰면 멈춘다")
    void validateColumnNeedsCodemapOrConstant() {
        CodeMap passthrough = new CodeMap(Map.of("1", PROBE_ACTIVE), UnmappedPolicy.PASSTHROUGH, null);
        PrecheckResult direct = check(spec(Map.of(),
                table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", null, null))), Map.of("COM075", COM075));
        PrecheckResult kept = check(spec(Map.of("task", passthrough),
                table("tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null))), Map.of("COM075", COM075));
        PrecheckResult fallback = check(spec(Map.of("task",
                        new CodeMap(Map.of("1", PROBE_ACTIVE), UnmappedPolicy.FALLBACK, "A03")),
                table("tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null))), Map.of("COM075", COM075));

        assertThat(direct.errors()).singleElement().asString()
                .isEqualTo("public.tb_ifml_atrz_info.task_se_cd: 쓰기 검증하는 공통코드 컬럼(COM075)은 codemap(미매핑 그대로"
                        + " 쓰기 아님)이나 상수로 채웁니다(VALIDATE_BINDING_CODEMAP_REQUIRED)");
        assertThat(kept.errors()).singleElement().asString().startsWith("tb_ifml_atrz_info.task_se_cd: ")
                .contains("VALIDATE_BINDING_CODEMAP_REQUIRED");
        assertThat(fallback.errors()).isEmpty();
        // 표시 바인딩은 codemap 없이 옮겨도 된다.
        assertThat(check(spec(Map.of(), table("public.tb_ifml_atrz_hstry",
                column("TASK", "task_se_cd", null, null))), Map.of("COM075", COM075)).errors()).isEmpty();
    }

    @Test
    @DisplayName("codemap 의 values 출력과 쓰이는 fallback 이 사용 중 상세코드 밖이면 위치만 밝혀 멈춘다")
    void codemapOutputsMustBeActive() {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("1", PROBE_ACTIVE);
        values.put("2", PROBE_INACTIVE);
        values.put("3", PROBE_UNKNOWN);
        values.put("4", "A03");
        MappingSpec spec = spec(Map.of("task", CodeMap.of(values)),
                table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null)));

        PrecheckResult result = check(spec, Map.of("COM075", COM075));

        assertThat(result.errors()).singleElement().asString()
                .isEqualTo("public.tb_ifml_atrz_info.task_se_cd: codemap task 의 values 위치 2·3 의 표준 코드가 공통코드"
                        + " 그룹(COM075)의 사용 중 상세코드가 아닙니다(CODE_OUTPUT_NOT_ACTIVE)");
        assertNoProbe(result);

        CodeMap unmappedFallback = new CodeMap(Map.of("1", PROBE_ACTIVE), UnmappedPolicy.FALLBACK, PROBE_INACTIVE);
        CodeMap nullFallback = new CodeMap(Map.of("1", PROBE_ACTIVE), UnmappedPolicy.FAIL, PROBE_UNKNOWN,
                NullPolicy.FALLBACK);
        for (CodeMap codemap : List.of(unmappedFallback, nullFallback)) {
            PrecheckResult fallback = check(spec(Map.of("task", codemap),
                    table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null))), Map.of("COM075", COM075));
            assertThat(fallback.errors()).singleElement().asString()
                    .isEqualTo("public.tb_ifml_atrz_info.task_se_cd: codemap task 의 fallback 표준 코드가 공통코드 그룹"
                            + "(COM075)의 사용 중 상세코드가 아닙니다(CODE_OUTPUT_NOT_ACTIVE)");
            assertNoProbe(fallback);
        }
        // 정의 없는 codemap 은 mapping 검증이 거부한다 — 여기서는 출력을 볼 수 없어 넘어간다.
        assertThat(check(spec(Map.of(), table("public.tb_ifml_atrz_info",
                column("TASK", "task_se_cd", "missing", null))), Map.of("COM075", COM075)).errors()).isEmpty();
    }

    @Test
    @DisplayName("쓰기 검증 컬럼의 상수는 사용 중 상세코드여야 하고, 표시 컬럼의 출력은 보지 않는다")
    void constantMustBeActive() {
        PrecheckResult active = check(spec(Map.of(), table("public.tb_ifml_atrz_info",
                column(null, "task_se_cd", null, PROBE_ACTIVE))), Map.of("COM075", COM075));
        PrecheckResult inactive = check(spec(Map.of(), table("public.tb_ifml_atrz_info",
                column(null, "task_se_cd", null, PROBE_INACTIVE))), Map.of("COM075", COM075));
        PrecheckResult display = check(spec(Map.of("task", codemap(PROBE_UNKNOWN)), table("public.tb_ifml_atrz_hstry",
                column("TASK", "task_se_cd", "task", null))), Map.of("COM075", COM075));

        assertThat(active.errors()).isEmpty();
        assertThat(inactive.errors()).singleElement().asString()
                .isEqualTo("public.tb_ifml_atrz_info.task_se_cd: 상수가 공통코드 그룹(COM075)의 사용 중 상세코드가"
                        + " 아닙니다(CODE_OUTPUT_NOT_ACTIVE)");
        assertNoProbe(inactive);
        assertThat(display.errors()).isEmpty();
        assertThat(display.groupAbsent()).isEmpty();
    }

    @Test
    @DisplayName("같은 schema 의 공통코드 표를 함께 적재하면 대상 DB 판정을 미루고, codemap 필수 규칙은 그대로 본다")
    void deferredWhenCodeTablesAreLoaded() {
        MappingSpec loadsCodes = spec(Map.of("task", codemap(PROBE_UNKNOWN)),
                table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null)),
                table("public.tb_ifml_atrz_hstry", column("TASK", "task_se_cd", null, null)),
                table("tb_com_dtl_cd", column("DTL", "dtl_cd", null, null)));
        MappingSpec loadsHeaders = spec(Map.of(),
                table("app.tb_ifml_atrz_info", column("TASK", "task_se_cd", null, null)),
                table("APP.TB_COM_CD", column("CD", "cd_id", null, null)));

        PrecheckResult deferred = check(loadsCodes, Map.of("COM075", CodeGroupState.absent()));
        PrecheckResult headers = CodeSetPrecheck.check(loadsHeaders, ProductCodeBindings.ALL, Map.of(), "public");

        assertThat(deferred.errors()).isEmpty();
        assertThat(deferred.deferred()).containsExactly("public");
        assertThat(deferred.deferred("PUBLIC")).isTrue();
        assertThat(deferred.deferred(null)).isFalse();
        assertThat(deferred.groupAbsent()).isEmpty();
        assertThat(headers.deferred()).containsExactly("app");
        assertThat(headers.errors()).singleElement().asString().contains("VALIDATE_BINDING_CODEMAP_REQUIRED");
        // 다른 schema 의 공통코드 표는 이 schema 판정을 미루지 않는다.
        MappingSpec otherSchema = spec(Map.of("task", codemap(PROBE_UNKNOWN)),
                table("public.tb_ifml_atrz_info", column("TASK", "task_se_cd", "task", null)),
                table("app.tb_com_dtl_cd", column("DTL", "dtl_cd", null, null)));
        assertThat(check(otherSchema, Map.of("COM075", COM075)).errors()).singleElement().asString()
                .contains("CODE_OUTPUT_NOT_ACTIVE");
    }

    @Test
    @DisplayName("읽을 그룹은 바인딩 컬럼을 쓰는 schema 마다 모으고, 바인딩 컬럼이 없으면 비운다")
    void requiredGroups() {
        MappingSpec spec = spec(Map.of(),
                table("tb_ifml_atrz_info", column("TASK", "task_se_cd", null, null), column("TITLE", "title", null, null)),
                table("app.tb_bbs_master", column("TY", "bbs_type_cd", null, null), column("AT", "bbs_atrb_cd", null, null)),
                table("public.tb_sys_log", column("P", "prcs_se_cd", null, null)));

        assertThat(CodeSetPrecheck.requiredGroups(spec, ProductCodeBindings.ALL, "Public")).containsExactly(
                Map.entry("public", Set.of("COM033", "COM075")), Map.entry("app", Set.of("COM004", "COM009")));
        assertThat(CodeSetPrecheck.requiredGroups(spec(Map.of(), table("public.tb_note", column("A", "note_cd", null,
                null))), ProductCodeBindings.ALL, "public")).isEmpty();
        assertThat(CodeSetPrecheck.requiredGroups(spec(Map.of(), table("tb_sys_log", column("P", "prcs_se_cd", null,
                null))), ProductCodeBindings.ALL, null)).containsOnlyKeys("public");
        assertThat(PrecheckResult.empty().passed()).isTrue();
        assertThat(PrecheckResult.empty().deferred()).isEmpty();
    }

    @Test
    @DisplayName("바인딩이 없는 표·컬럼과 비어 있는 매핑은 보지 않는다")
    void ignoresUnboundColumns() {
        MappingSpec spec = new MappingSpec(null, null, java.util.Arrays.asList(null,
                table("public.tb_ifml_atrz_info", column("TITLE", "title", null, null),
                        new ColumnMapping("X", " ", null, null, null, null, null)),
                table(" ", column("TASK", "task_se_cd", null, null))), Map.of());

        PrecheckResult result = check(spec, Map.of("COM075", CodeGroupState.absent()));

        assertThat(result.errors()).isEmpty();
        assertThat(result.groupAbsent()).isEmpty();
        assertThat(CodeGroupState.absent().toString()).isEqualTo("CodeGroupState[absent]");
        assertThat(COM075.toString()).isEqualTo("CodeGroupState[present]").doesNotContain(PROBE_ACTIVE);
        assertThat(new CodeGroupState(true, null, null).active()).isEmpty();
    }

    private static PrecheckResult check(MappingSpec spec, Map<String, CodeGroupState> groups) {
        return CodeSetPrecheck.check(spec, ProductCodeBindings.ALL, Map.of("public", groups), "public");
    }

    private static void assertNoProbe(PrecheckResult result) {
        assertThat(String.join("\n", result.errors()))
                .doesNotContain(PROBE_ACTIVE, PROBE_INACTIVE, PROBE_UNKNOWN);
    }

    private static CodeMap codemap(String output) {
        return CodeMap.of(Map.of("1", output));
    }

    static MappingSpec spec(Map<String, CodeMap> codemaps, TableMapping... tables) {
        return new MappingSpec(null, null, List.of(tables), codemaps);
    }

    static TableMapping table(String target, ColumnMapping... columns) {
        return new TableMapping("legacy.src", target, null, List.of(columns), null);
    }

    static ColumnMapping column(String source, String target, String codemap, String constant) {
        return new ColumnMapping(source, target, null, null, codemap, null, constant);
    }
}
