package nuri.migration.protect;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import com.fasterxml.jackson.databind.json.JsonMapper;
import nuri.migration.artifact.MappingSpecDigester;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** mapping 의 보호 컬럼 선언과 온라인 보호 목록의 대조(DEC-OPS-308). 문구는 테이블·컬럼 이름만 담는다. */
@DisplayName("보호 컬럼 선언 대조")
class ColumnProtectionPlanTest {

    private static final String ARIA = "aria-egov-v1";

    @Test
    @DisplayName("같은 방식을 선언한 보호 컬럼만 암호화 대상이 된다 — 스키마·대소문자는 가리지 않는다")
    void declaredProtectionBecomesAPlannedColumn() {
        ColumnProtectionPlan plan = plan(table("public.TB_USER_INFO",
                column("JUMIN", "USER_ENRRNO", ARIA), column("NM", "user_nm", null)));

        assertThat(plan.violations()).isEmpty();
        assertThat(plan.columns()).containsOnlyKeys("tb_user_info.user_enrrno");
        assertThat(ProtectedTargetColumns.entries()).extracting(entry -> entry.table() + "." + entry.column())
                .containsExactly("tb_user_info.user_enrrno", "tb_auth_otp_cert.otp_secret_encpt_cn");
        ColumnProtectionPlan.ProtectedColumn planned = plan.columns().get("tb_user_info.user_enrrno");
        assertThat(planned.targetTable()).isEqualTo("public.TB_USER_INFO");
        assertThat(planned.column()).isEqualTo("USER_ENRRNO");
        assertThat(planned.entry().protection()).isEqualTo(ColumnProtection.ARIA_EGOV_V1);
    }

    @Test
    @DisplayName("온라인 앱이 암호화하는 컬럼을 선언 없이 쓰면 위반이다 — 스키마 한정 이름으로도 피할 수 없다")
    void undeclaredProtectedColumnIsAViolation() {
        assertThat(plan(table("tb_user_info", column("JUMIN", "user_enrrno", null))).violations())
                .containsExactly("tb_user_info.user_enrrno: 온라인 앱이 암호화해 저장하는 컬럼입니다"
                        + " — encrypt: aria-egov-v1 를 선언해야 평문으로 쓰지 않습니다");
        assertThat(plan(table("egov.Tb_User_Info", column("JUMIN", "User_Enrrno", null))).violations())
                .singleElement().asString().startsWith("egov.Tb_User_Info.User_Enrrno: 온라인 앱이 암호화해");
        assertThat(plan(table("tb_auth_otp_cert", column("SECRET", "otp_secret_encpt_cn", null))).violations())
                .containsExactly("tb_auth_otp_cert.otp_secret_encpt_cn: 온라인 앱이 암호화해 저장하는 컬럼입니다"
                        + " — 이관 도구가 만들 수 없는 보호 방식이라 매핑할 수 없습니다(온라인 앱에서 다시 만듭니다)");
    }

    @Test
    @DisplayName("선언이 온라인 목록과 어긋나면 위반이다 — 선언 원문은 문구에 담지 않는다")
    void mismatchedDeclarationsAreViolations() {
        assertThat(plan(table("tb_user_info", column("J", "user_enrrno", "aria-egov-v9"))).violations())
                .containsExactly("tb_user_info.user_enrrno: 알 수 없는 encrypt 방식입니다");
        assertThat(plan(table("tb_user_info", column("NM", "user_nm", ARIA))).violations())
                .containsExactly("tb_user_info.user_nm: 온라인 앱이 암호화하지 않는 컬럼에 encrypt 를 선언했습니다");
        assertThat(plan(table("tb_user_info", column("J", "user_enrrno", "mfa-aes-gcm-v1"))).violations())
                .containsExactly("tb_user_info.user_enrrno: encrypt 방식이 온라인 앱의 보호 방식과 다릅니다");
        assertThat(plan(table("tb_auth_otp_cert", column("S", "otp_secret_encpt_cn", "mfa-aes-gcm-v1"))).violations())
                .containsExactly("tb_auth_otp_cert.otp_secret_encpt_cn: 이관 도구가 만들 수 없는 보호 방식이라"
                        + " 매핑할 수 없습니다(온라인 앱에서 다시 만듭니다)");
    }

    @Test
    @DisplayName("encrypt 컬럼은 source 로만 채우고 codemap·type·fkRef 와 섞지 않는다")
    void encryptedColumnsTakeOnlyASourceValue() {
        String sourceOnly = "tb_user_info.user_enrrno: encrypt 컬럼은 const 없이 source 로만 채웁니다";
        String noMix = "tb_user_info.user_enrrno: encrypt 컬럼에는 codemap·type·fkRef 를 함께 쓸 수 없습니다";
        assertThat(violations(new ColumnMapping(null, "user_enrrno", null, null, null, null, "800101-1234567", ARIA)))
                .containsExactly(sourceOnly);
        assertThat(violations(new ColumnMapping("J", "user_enrrno", null, null, null, null, "x", ARIA)))
                .containsExactly(sourceOnly);
        assertThat(violations(new ColumnMapping(" ", "user_enrrno", null, null, null, null, null, ARIA)))
                .containsExactly(sourceOnly);
        assertThat(violations(new ColumnMapping("J", "user_enrrno", null, null, "codes", null, null, ARIA)))
                .containsExactly(noMix);
        assertThat(violations(new ColumnMapping("J", "user_enrrno", null, "date", null, null, null, ARIA)))
                .containsExactly(noMix);
        assertThat(violations(new ColumnMapping("J", "user_enrrno", null, null, null, "LEGACY", null, ARIA)))
                .containsExactly(noMix);
        assertThat(violations(new ColumnMapping("J", "user_enrrno", "trim", " ", "", null, null, ARIA))).isEmpty();
    }

    @Test
    @DisplayName("보호 컬럼은 idStrategy·identity·복합 FK 의 대상 컬럼으로 쓸 수 없다")
    void protectedColumnsAreNeverKeys() {
        String message = "tb_user_info.user_enrrno: 보호 컬럼은 식별자·참조 키로 쓸 수 없습니다";
        TableMapping idStrategy = new TableMapping("LEGACY", "tb_user_info", null, null, List.of(), null,
                List.of(), new IdStrategy("user_enrrno", "USR_", "ID"), null, List.of());
        IdentityComponentSpec rrno = new IdentityComponentSpec("user_enrrno", IdentityValueType.TEXT);
        TableMapping identity = new TableMapping("LEGACY", "tb_user_info", null, null, List.of("ID"), null,
                List.of(), null, new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponentSpec("ID", IdentityValueType.TEXT)), List.of(rrno)), List.of());
        TableMapping foreignKey = new TableMapping("LEGACY", "tb_user_info", null, null, List.of(), null,
                List.of(), null, null, List.of(new CompositeForeignKey("PARENT",
                List.of(new IdentityComponentSpec("P", IdentityValueType.TEXT)), List.of(rrno))));
        TableMapping harmless = new TableMapping("LEGACY", "tb_user_info", null, null, List.of(), null,
                List.of(), new IdStrategy("esntl_id", "USR_", "ID"), null, List.of());

        assertThat(plan(idStrategy).violations()).containsExactly(message);
        assertThat(plan(identity).violations()).containsExactly(message);
        assertThat(plan(foreignKey).violations()).containsExactly(message);
        assertThat(plan(harmless).violations()).isEmpty();
    }

    @Test
    @DisplayName("암호화할 소스 값은 정렬·식별자·참조 키의 소스로 쓸 수 없다 — 평문이 checkpoint·keymap 에 남는다")
    void encryptedSourceValuesAreNeverKeySources() {
        String message = "tb_user_info.user_enrrno: 암호화할 소스 값을 정렬·식별자·참조 키로 쓸 수 없습니다"
                + "(평문이 제어 테이블에 남습니다)";
        ColumnMapping rrno = column("JUMIN_NO", "user_enrrno", ARIA);
        IdentityComponentSpec rrnoSource = new IdentityComponentSpec("jumin_no", IdentityValueType.TEXT);
        IdentityComponentSpec esntlId = new IdentityComponentSpec("esntl_id", IdentityValueType.TEXT);
        List<TableMapping> keyed = List.of(
                keyedTable("jumin_no", List.of(), null, null, List.of(), rrno),
                keyedTable(null, List.of("ID", " Jumin_No "), null, null, List.of(), rrno),
                keyedTable("ID", List.of(), new IdStrategy("esntl_id", "USR_", "JUMIN_NO"), null, List.of(), rrno),
                keyedTable("ID", List.of(), null, new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(rrnoSource), List.of(esntlId)), List.of(), rrno),
                keyedTable("ID", List.of(), null, null, List.of(new CompositeForeignKey("LEGACY_PARENT",
                        List.of(rrnoSource), List.of(new IdentityComponentSpec("parent_id", IdentityValueType.TEXT)))),
                        rrno),
                keyedTable("ID", List.of(), null, null, List.of(), rrno,
                        new ColumnMapping("JUMIN_NO", "parent_id", null, null, null, "LEGACY_PARENT", null)));
        for (TableMapping table : keyed) {
            assertThat(plan(table).violations()).as(table.toString()).containsExactly(message);
        }
        assertThat(plan(keyedTable("ID", List.of(), new IdStrategy("esntl_id", "USR_", "ID"), null, List.of(), rrno,
                new ColumnMapping("PARENT_NO", "parent_id", null, null, null, "LEGACY_PARENT", null))).violations())
                .as("다른 소스 컬럼이 키면 통과한다").isEmpty();
    }

    @Test
    @DisplayName("빈 항목·대상 없는 항목은 건너뛴다(다른 검증이 따로 막는다)")
    void incompleteEntriesAreLeftToTheMappingValidator() {
        List<ColumnMapping> columns = new ArrayList<>(Arrays.asList(null, column("J", null, ARIA)));
        TableMapping noTarget = new TableMapping("LEGACY", null, null, List.of(column("J", "user_enrrno", null)), null);
        TableMapping nullColumns = new TableMapping("LEGACY", "tb_user_info", null, columns, null);
        List<TableMapping> tables = new ArrayList<>(Arrays.asList(null, noTarget, nullColumns));

        ColumnProtectionPlan plan = ColumnProtectionPlan.of(new MappingSpec(null, null, tables, Map.of()));

        assertThat(plan.violations()).isEmpty();
        assertThat(plan.columns()).isEmpty();
    }

    @Test
    @DisplayName("YAML 의 encrypt 를 읽고, 선언이 없으면 직렬화하지 않아 기존 mapping digest 가 그대로다")
    void yamlBindingAndDigestStability() throws Exception {
        MappingSpec mapping = new MappingLoader(ignored -> null).loadContent("""
                tables:
                  - source: legacy_user
                    target: tb_user_info
                    columns:
                      - { source: jumin, target: user_enrrno, transform: trim, encrypt: aria-egov-v1 }
                      - { source: nm, target: user_nm }
                """);

        List<ColumnMapping> columns = mapping.tables().getFirst().columns();
        assertThat(columns.get(0).encrypt()).isEqualTo(ARIA);
        assertThat(columns.get(1).encrypt()).isNull();
        JsonMapper json = JsonMapper.builder().build();
        assertThat(json.valueToTree(columns.get(0)).has("encrypt")).isTrue();
        assertThat(json.valueToTree(columns.get(1)).has("encrypt")).isFalse();
        // encrypt 선언은 plan 이 결속하는 mapping digest 에 들어간다.
        ColumnMapping plain = new ColumnMapping("jumin", "user_enrrno", "trim", null, null, null, null);
        assertThat(MappingSpecDigester.sha256(new MappingSpec(null, null, List.of(table("tb_user_info", plain)), Map.of())))
                .isNotEqualTo(MappingSpecDigester.sha256(new MappingSpec(null, null,
                        List.of(table("tb_user_info", columns.get(0))), Map.of())));
        assertThat(ColumnProtectionPlan.of(mapping).columns()).containsOnlyKeys("tb_user_info.user_enrrno");
    }

    @Test
    @DisplayName("암호화해 적재할 소스 값은 외부 보관 덤프에 넣을 수 없다 — 같은 표의 다른 컬럼·다른 표의 같은 이름은 막지 않는다")
    void encryptedSourceValuesAreNeverArchived() {
        TableMapping users = new TableMapping("legacy.USER_MST", "tb_user_info", null, "USER_SN", "user_sn",
                List.of(column("USER_SN", "user_sn", null), column("JUMIN", "user_enrrno", ARIA)), null);
        String plaintext = "tb_user_info.user_enrrno: 암호화할 소스 값은 외부 보관 덤프에 넣을 수 없습니다(덤프에 평문으로"
                + " 남습니다)";

        assertThat(archived(users, " LEGACY.user_mst ", " jumin ")).as("표기·대소문자·공백이 달라도 같은 컬럼이다")
                .containsExactly(plaintext);
        assertThat(archived(users, "legacy.USER_MST", "ETC1")).as("암호화하지 않는 컬럼의 보관").isEmpty();
        assertThat(archived(users, "legacy.LOG", "JUMIN")).as("다른 표의 같은 이름 컬럼").isEmpty();
    }

    private static List<String> archived(TableMapping table, String source, String column) {
        return ColumnProtectionPlan.of(new MappingSpec(null, null, List.of(table), Map.of(), null, null,
                List.of(new MappingSpec.ArchiveDump("legacy_user_20311231", source, null, List.of(), List.of(column),
                        List.of("U7"), "2031-12-31")))).violations();
    }

    private static List<String> violations(ColumnMapping column) {
        return plan(table("tb_user_info", column)).violations();
    }

    private static ColumnProtectionPlan plan(TableMapping table) {
        return ColumnProtectionPlan.of(new MappingSpec(null, null, List.of(table), Map.of()));
    }

    private static TableMapping table(String target, ColumnMapping... columns) {
        return new TableMapping("LEGACY", target, null, List.of(columns), null);
    }

    private static TableMapping keyedTable(String orderBy, List<String> orderByKeys, IdStrategy idStrategy,
                                           IdentityStrategy identity, List<CompositeForeignKey> foreignKeys,
                                           ColumnMapping... columns) {
        return new TableMapping("LEGACY", "tb_user_info", null, orderBy, orderByKeys, null, List.of(columns),
                idStrategy, identity, foreignKeys);
    }

    private static ColumnMapping column(String source, String target, String encrypt) {
        return new ColumnMapping(source, target, null, null, null, null, null, encrypt);
    }
}
