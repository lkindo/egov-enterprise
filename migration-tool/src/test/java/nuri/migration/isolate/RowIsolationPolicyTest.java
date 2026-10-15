package nuri.migration.isolate;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.isolate.RowIsolationPolicy.Failure;
import nuri.migration.isolate.RowIsolationPolicy.Isolated;
import nuri.migration.isolate.RowIsolationPolicy.Match;
import nuri.migration.isolate.RowIsolationPolicy.StopCause;
import nuri.migration.isolate.RowIsolationPolicy.Stopped;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.validate.ledger.LoadCapabilities;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 승인 행 격리 판정(ADR-0029 L3b). 실패 하나라도 승인되지 않으면 멈추고, 모두 승인돼야 격리한다. 격리 어휘 대응표와
 * 격리할 수 없는 표·컬럼의 판정을 함께 본다.
 */
class RowIsolationPolicyTest {

    private static final Failure PLACEHOLDER = new Failure("end_ymd", "DOMAIN_VIOLATION", "PLACEHOLDER_DATE");
    private static final Failure INVALID = new Failure("end_ymd", "DOMAIN_VIOLATION", "INVALID_DATE");
    private static final Failure UNMAPPED = new Failure("sttus_cd", "CODEMAP_UNMAPPED", null);

    private final RowIsolationPolicy policy = RowIsolationPolicy.of(table(
            column("END_YMD", "end_ymd", new Isolate("U4", 3L, List.of("PLACEHOLDER_DATE"))),
            column("STTUS", "sttus_cd", new Isolate("U7", 5L, List.of("CODEMAP_UNMAPPED", "FORMAT"))),
            column("USER_NM", "user_nm", null)));

    @Test
    void aRowWhoseEveryFailureIsApprovedIsIsolatedUnderEachLedgerEntry() {
        assertThat(policy.active()).isTrue();
        assertThat(policy.caps()).containsExactly(java.util.Map.entry("U4", 3L), java.util.Map.entry("U7", 5L));
        assertThat(policy.decide(List.of(PLACEHOLDER), false))
                .isEqualTo(new Isolated(List.of(new Match("U4", "end_ymd", "PLACEHOLDER_DATE"))));
        assertThat(policy.decide(List.of(new Failure("END_YMD", "DOMAIN_VIOLATION", "PLACEHOLDER_DATE"), UNMAPPED),
                false)).as("대상 컬럼 이름은 대소문자를 가리지 않고, 한 행의 승인 위반은 원장 행마다 모두 센다")
                .isEqualTo(new Isolated(List.of(new Match("U4", "end_ymd", "PLACEHOLDER_DATE"),
                        new Match("U7", "sttus_cd", "CODEMAP_UNMAPPED"))));
    }

    @Test
    void anUnapprovedFailureAfterAnApprovedOneStillStopsTheRow() {
        Failure unapproved = new Failure("user_nm", "DOMAIN_VIOLATION", "BLANK");
        Failure identity = new Failure("<identity>", "IDENTITY_FAILED", null);

        assertThat(policy.decide(List.of(PLACEHOLDER, unapproved), false))
                .isEqualTo(new Stopped(StopCause.NOT_DECLARED, unapproved));
        assertThat(policy.decide(List.of(PLACEHOLDER, identity), false))
                .as("승인된 컬럼 위반 뒤의 식별자 실패가 숨지 않는다")
                .isEqualTo(new Stopped(StopCause.NOT_DECLARED, identity));
        assertThat(policy.decide(List.of(PLACEHOLDER, INVALID), false))
                .isEqualTo(new Stopped(StopCause.NOT_APPROVED, INVALID));
    }

    @Test
    void aCodeOutsideTheColumnsApprovedViolationsStops() {
        assertThat(policy.decide(List.of(INVALID), false)).isEqualTo(new Stopped(StopCause.NOT_APPROVED, INVALID));
        Failure blank = new Failure("sttus_cd", "DOMAIN_VIOLATION", "BLANK");
        assertThat(policy.decide(List.of(blank), false)).as("다른 컬럼이 승인한 코드는 이 컬럼의 승인이 아니다")
                .isEqualTo(new Stopped(StopCause.NOT_APPROVED, blank));
        Failure typed = new Failure("sttus_cd", "TYPE_CONVERSION_FAILED", null);
        assertThat(policy.decide(List.of(typed), false))
                .isEqualTo(new Isolated(List.of(new Match("U7", "sttus_cd", "FORMAT"))));
    }

    @Test
    void failuresOutsideTheVocabularyTableCannotBeIsolated() {
        for (Failure failure : List.of(
                new Failure("sttus_cd", "TRANSFORM_FAILED", null),
                new Failure("sttus_cd", "CODEMAP_INPUT_INVALID", null),
                new Failure("sttus_cd", "CODEMAP_UNDEFINED", null),
                new Failure("sttus_cd", "FK_REF_ORPHAN", null),
                new Failure("sttus_cd", "PROTECTED_COLUMN", "PLAINTEXT"),
                new Failure("sttus_cd", "NULLIFY_CAP_EXCEEDED", "BLANK"),
                new Failure("sttus_cd", "DOMAIN_VIOLATION", "UNSUPPORTED_VALUE_TYPE"),
                new Failure("sttus_cd", "DOMAIN_VIOLATION", null),
                new Failure("sttus_cd", null, null))) {
            assertThat(policy.decide(List.of(failure), false)).as(failure.toString())
                    .isEqualTo(new Stopped(StopCause.NOT_ISOLATABLE, failure));
        }
    }

    @Test
    void theVocabularyTableMapsOnlyItsFourRows() {
        for (String code : List.of("PLACEHOLDER_DATE", "LENGTH_EXCEEDED", "REQUIRED_MISSING")) {
            assertThat(RowIsolationPolicy.isolationCode("DOMAIN_VIOLATION", code)).isEqualTo(code);
        }
        assertThat(RowIsolationPolicy.isolationCode("TYPE_CONVERSION_FAILED", null)).isEqualTo("FORMAT");
        assertThat(RowIsolationPolicy.isolationCode("TRANSFORM_FAILED", "FORMAT")).isEqualTo("FORMAT");
        assertThat(RowIsolationPolicy.isolationCode("CODEMAP_UNMAPPED", null)).isEqualTo("CODEMAP_UNMAPPED");
        assertThat(RowIsolationPolicy.isolationCode("TRANSFORM_FAILED", null)).isNull();
        assertThat(RowIsolationPolicy.isolationCode("TRANSFORM_FAILED", "PLACEHOLDER_DATE")).isNull();
        assertThat(RowIsolationPolicy.isolationCode("DOMAIN_VIOLATION", "UNSUPPORTED_VALUE_TYPE")).isNull();
        assertThat(RowIsolationPolicy.isolationCode("DOMAIN_VIOLATION", "NOT_ALLOWED")).isNull();
        assertThat(RowIsolationPolicy.isolationCode("ATOMIC_WRITE_FAILED", null)).as("쓰기 단계는 격리하지 않는다")
                .isNull();
        assertThat(RowIsolationPolicy.isolationCode(null, "FORMAT")).isNull();
        for (String code : LoadCapabilities.ISOLATABLE) {
            assertThat(RowIsolationPolicy.isolationCode("DOMAIN_VIOLATION", code)).isEqualTo(code);
        }
    }

    @Test
    void aRowAlreadyCommittedCannotBeIsolatedWhenItNowFails() {
        assertThat(policy.decide(List.of(PLACEHOLDER), true))
                .isEqualTo(new Stopped(StopCause.ISOLATION_ON_DURABLE_ROW, PLACEHOLDER));
        assertThat(policy.decide(List.of(INVALID), true)).as("승인되지 않은 실패가 먼저다")
                .isEqualTo(new Stopped(StopCause.NOT_APPROVED, INVALID));
    }

    @Test
    void aTableWithoutDeclarationsIsNotCollecting() {
        RowIsolationPolicy plain = RowIsolationPolicy.of(table(column("USER_NM", "user_nm", null)));

        assertThat(plain.active()).isFalse();
        assertThat(plain.caps()).isEmpty();
        assertThat(plain.decide(List.of(PLACEHOLDER), false))
                .isEqualTo(new Stopped(StopCause.NOT_DECLARED, PLACEHOLDER));
        assertThatThrownBy(() -> plain.decide(List.of(), false)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void incompleteDeclarationsAreRefusedBeforeTheyCanIsolate() {
        for (Isolate broken : List.of(new Isolate(null, 3L, List.of("FORMAT")),
                new Isolate("U4", null, List.of("FORMAT")),
                new Isolate("U4", 0L, List.of("FORMAT")), new Isolate("U4", 1001L, List.of("FORMAT")),
                new Isolate("U4", 3L, List.of()))) {
            assertThatThrownBy(() -> RowIsolationPolicy.of(table(column("END_YMD", "end_ymd", broken))))
                    .as(broken.toString()).isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("legacy.user_mst: isolate 선언이 완전하지 않습니다");
        }
        assertThatThrownBy(() -> RowIsolationPolicy.of(table(
                column("A", "end_ymd", new Isolate("U4", 3L, List.of("FORMAT"))),
                column("B", "END_YMD", new Isolate("U5", 3L, List.of("FORMAT"))))))
                .hasMessage("legacy.user_mst: 같은 대상 컬럼에 isolate 가 두 번 있습니다");
        assertThatThrownBy(() -> RowIsolationPolicy.of(table(
                column("A", "a", new Isolate("U4", 3L, List.of("FORMAT"))),
                column("B", "b", new Isolate("U4", 4L, List.of("FORMAT"))))).caps())
                .hasMessage("원장 행 U4 의 isolate 상한이 컬럼마다 다릅니다");
    }

    @Test
    void tablesWhoseRowsCannotBeIsolatedAreNamed() {
        TableMapping parent = new TableMapping("legacy.dept_mst", "public.tb_ognz_info", null, "DEPT_CD", "ognz_id",
                List.of(), null);
        TableMapping child = new TableMapping("legacy.user_mst", "public.tb_user_info", null, "USER_SN", "esntl_id",
                List.of(new ColumnMapping("DEPT_CD", "ognz_id", null, null, null, "LEGACY.DEPT_MST", null)), null);
        TableMapping self = new TableMapping("legacy.menu", "public.tb_menu", null, "MENU_SN", "menu_id",
                List.of(new ColumnMapping("UP_MENU", "up_menu_id", null, null, null, "legacy.menu", null)), null);
        TableMapping generated = typed("legacy.log", TargetIdentityPolicy.TARGET_GENERATED, List.of());
        TableMapping preserved = typed("legacy.code", TargetIdentityPolicy.PRESERVE, List.of());
        TableMapping composite = typed("legacy.code_dtl", TargetIdentityPolicy.PRESERVE,
                List.of(new CompositeForeignKey("legacy.code", List.of(component("CODE")),
                        List.of(component("code")))));
        List<TableMapping> tables = List.of(parent, child, self, generated, preserved, composite);

        assertThat(RowIsolationPolicy.tableBlocker(tables, parent)).isEqualTo("다른 매핑이 부모로 참조하는 매핑");
        assertThat(RowIsolationPolicy.tableBlocker(tables, child)).isNull();
        assertThat(RowIsolationPolicy.tableBlocker(tables, self)).isEqualTo("자기참조 매핑");
        assertThat(RowIsolationPolicy.tableBlocker(tables, generated)).isEqualTo("target_generated 매핑");
        assertThat(RowIsolationPolicy.tableBlocker(tables, preserved)).as("복합 FK 의 부모")
                .isEqualTo("다른 매핑이 부모로 참조하는 매핑");
        assertThat(RowIsolationPolicy.tableBlocker(tables, composite)).isNull();
    }

    @Test
    void columnsWhoseValuesCannotBeIsolatedAreNamed() {
        assertThat(RowIsolationPolicy.columnBlocker(new ColumnMapping("RRN", "user_enrrno", null, null, null, null,
                null, "aria-egov-v1"))).isEqualTo("암호화 컬럼");
        assertThat(RowIsolationPolicy.columnBlocker(new ColumnMapping("DEPT_CD", "ognz_id", "trim", null, null,
                "legacy.dept_mst", null))).isEqualTo("fkRef 컬럼");
        assertThat(RowIsolationPolicy.columnBlocker(new ColumnMapping(null, "frst_rgtr_id", null, null, null, null,
                "MIGRATION"))).isEqualTo("값을 변환하지 않는 컬럼(const·source 없음)");
        assertThat(RowIsolationPolicy.columnBlocker(new ColumnMapping(" ", "x", null, null, null, null, null)))
                .isEqualTo("값을 변환하지 않는 컬럼(const·source 없음)");
        assertThat(RowIsolationPolicy.columnBlocker(new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null,
                null))).isNull();
    }

    private static TableMapping table(ColumnMapping... columns) {
        return new TableMapping("legacy.user_mst", "public.tb_user_info", null, "USER_SN", "esntl_id",
                List.of(columns), null);
    }

    private static ColumnMapping column(String source, String target, Isolate isolate) {
        return new ColumnMapping(source, target, null, null, null, null, null, null, List.of(), isolate);
    }

    private static TableMapping typed(String source, TargetIdentityPolicy policy, List<CompositeForeignKey> keys) {
        return new TableMapping(source, "public.tb_x", null, null, List.of("CODE"), null, List.of(), null,
                new IdentityStrategy(policy, List.of(component("CODE")), List.of(component("code"))), keys);
    }

    private static IdentityComponentSpec component(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.TEXT);
    }
}
