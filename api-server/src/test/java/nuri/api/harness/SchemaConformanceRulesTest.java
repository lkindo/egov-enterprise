package nuri.api.harness;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.Set;
import nuri.api.harness.SchemaConformanceRules.CatalogNames;
import nuri.api.harness.SchemaConformanceRules.EntityMirror;
import nuri.api.schema.VendorOwnershipExtension;
import nuri.api.schema.VendorOwnershipExtension.SchemaCheck;
import nuri.foundation.domain.common.IntegralStringConverter;
import org.hibernate.tool.schema.internal.HibernateSchemaManagementTool;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * 벤더 카탈로그 시험의 판정을 DB 없이 붉힌다. 그 시험은 벤더 컨테이너가 있어야 돌므로, 판정이 무력해져도 일반 실행에는 드러나지 않는다.
 * 벤더 시나리오 문맥이 Hibernate validate 로 떴는지의 판정({@link VendorOwnershipExtension#schemaCheck})도 같은 이유로 여기서 붉힌다.
 */
@Tag("governance-harness")
class SchemaConformanceRulesTest {

    private static final Map<String, Map<String, String>> NO_TYPES = Map.of();
    private static final Set<String> NO_VIEWS = Set.of();

    private static CatalogNames catalog(Set<String> columns, Set<String> constraints, Set<String> indexes, Set<String> sequences) {
        return new CatalogNames(columns, constraints, indexes, sequences);
    }

    private static final CatalogNames BASELINE = catalog(
            Set.of("tb_a.id", "tb_a.crt_dt", "flyway_schema_history.version"),
            Set.of("tb_a.pk_tb_a", "tb_a.tb_a_adapter_named"), Set.of("tb_a.tb_a_legacy_idx"), Set.of(".legacy_seq"));

    @Test
    @DisplayName("기준선의 이름은 규칙을 어겨도 보지 않고 새 객체만 본다")
    void baselineObjectsAreNotJudged() {
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, BASELINE, NO_TYPES, NO_VIEWS)).isEmpty();
    }

    @Test
    @DisplayName("표준 밖의 새 제약·인덱스·시퀀스 이름은 붉다")
    void newObjectViolationsAreReported() {
        CatalogNames current = catalog(BASELINE.columns(),
                Set.of("tb_a.pk_tb_a", "tb_a.tb_a_adapter_named", "bad_table.c_wrong"), Set.of("tb_a.tb_a_legacy_idx", "tb_a.idx_wrong"), Set.of(".legacy_seq", ".seq_wrong"));
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, NO_TYPES, NO_VIEWS))
                .anyMatch(problem -> problem.startsWith("제약명 'bad_table.c_wrong'"))
                .anyMatch(problem -> problem.startsWith("인덱스명 'tb_a.idx_wrong'"))
                .anyMatch(problem -> problem.startsWith("시퀀스명 'seq_wrong'"));
    }

    private static final Set<String> BASELINE_TABLES = Set.of("tb_a", "flyway_schema_history");
    private static final Map<String, String> AUDITED = Map.of("frst_rgtr_id", "VARCHAR(20)", "crt_dt", "TIMESTAMP(6)");

    @Test
    @DisplayName("기준선 표와 Flyway 이력 표, 표준을 따른 새 표는 저장 표기가 맞으면 통과한다")
    void storedTablesFollowingTheStandardPass() {
        assertThat(SchemaConformanceRules.tableProblems(Set.of("TB_A", "flyway_schema_history", "TB_C"), BASELINE_TABLES, NO_VIEWS, Map.of("tb_c", AUDITED), true)).isEmpty();
        assertThat(SchemaConformanceRules.tableProblems(Set.of("tb_a", "tb_c"), BASELINE_TABLES, NO_VIEWS, Map.of("tb_c", AUDITED), false))
                .as("따옴표 없는 이름을 대문자로 접지 않는 DB 는 소문자 저장이 정상이다").isEmpty();
    }

    @Test
    @DisplayName("tb_ 없는 새 표와 감사 컬럼 누락·짝 깨짐은 붉다")
    void newTableViolationsAreReported() {
        Map<String, Map<String, String>> schema = Map.of("bad_table", Map.of("id", "NUMERIC(10,0)"),
                "tb_b", Map.of("frst_rgtr_id", "VARCHAR(20)", "crt_dt", "TIMESTAMP(6)", "mdfcn_dt", "TIMESTAMP(6)"));
        assertThat(SchemaConformanceRules.tableProblems(Set.of("TB_A", "BAD_TABLE", "TB_B"), BASELINE_TABLES, NO_VIEWS, schema, true))
                .anyMatch(problem -> problem.startsWith("테이블명 'BAD_TABLE'"))
                .anyMatch(problem -> problem.contains("'bad_table'") && problem.contains("최소 감사컬럼"))
                .anyMatch(problem -> problem.contains("'tb_b'") && problem.contains("감사컬럼 짝 깨짐"));
    }

    @Test
    @DisplayName("이름 목록에 없는 따옴표 표도 드라이버 목록으로 붉다 — 소문자·혼합 저장 표기와 형식 밖 이름")
    void quotedTablesAreRedByTheStoredName() {
        Map<String, Map<String, String>> schema = Map.of("tb_log", AUDITED, "tb_mixed", AUDITED);
        assertThat(SchemaConformanceRules.tableProblems(Set.of("tb_log", "Tb_Mixed"), BASELINE_TABLES, NO_VIEWS, schema, true))
                .hasSize(2).allMatch(problem -> problem.contains("따옴표로 만든 저장 표기"));
        assertThat(SchemaConformanceRules.tableProblems(Set.of("bad-name", "게시판"), BASELINE_TABLES, NO_VIEWS, Map.of(), true))
                .anyMatch(problem -> problem.startsWith("테이블명 'bad-name'")).anyMatch(problem -> problem.startsWith("테이블명 '게시판'"));
        assertThat(SchemaConformanceRules.tableProblems(Set.of("bad-name"), BASELINE_TABLES, NO_VIEWS, Map.of(), false))
                .anyMatch(problem -> problem.startsWith("테이블명 'bad-name'")).anyMatch(problem -> problem.contains("최소 감사컬럼"));
    }

    @Test
    @DisplayName("기준선 이름을 따옴표로 다시 쓴 표는 기준선 표에 가려지지 않는다")
    void aQuotedTwinOfABaselineTableIsRed() {
        assertThat(SchemaConformanceRules.tableProblems(Set.of("TB_A", "tb_a"), BASELINE_TABLES, NO_VIEWS, Map.of(), true))
                .singleElement().asString().contains("'tb_a'").contains("따옴표로 만든 저장 표기");
    }

    @Test
    @DisplayName("표준을 따른 새 표와 객체는 통과하고, 새 고정 문자형 컬럼은 붉다")
    void compliantObjectsPassAndFixedCharIsRed() {
        CatalogNames current = catalog(
                Set.of("tb_a.id", "tb_a.crt_dt", "flyway_schema_history.version", "tb_c.id", "tb_c.frst_rgtr_id", "tb_c.crt_dt"),
                Set.of("tb_a.pk_tb_a", "tb_a.tb_a_adapter_named", "tb_c.pk_tb_c"), Set.of("tb_a.tb_a_legacy_idx", "tb_c.ix_tb_c_id"), Set.of(".legacy_seq", ".sq_tb_c"));
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, Map.of("tb_c", Map.of("id", "VARCHAR(20)")), NO_VIEWS)).isEmpty();
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, Map.of("tb_c", Map.of("id", "CHAR(20)")), NO_VIEWS))
                .singleElement().asString().contains("고정 문자형");
    }

    @Test
    @DisplayName("뷰는 표 규칙으로 보지 않고 이름만 본다 — 드라이버가 뷰라고 답하지 않은 이름은 표로 남는다")
    void viewsFollowTheViewRuleOnly() {
        CatalogNames current = catalog(
                Set.of("tb_a.id", "tb_a.crt_dt", "flyway_schema_history.version", "vw_sample.id", "bad_view.id"),
                BASELINE.constraints(), BASELINE.indexes(), BASELINE.sequences());
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, NO_TYPES, Set.of("vw_sample", "bad_view")))
                .singleElement().asString().startsWith("뷰명 'bad_view'");
        assertThat(SchemaConformanceRules.tableProblems(Set.of("TB_A", "VW_SAMPLE", "BAD_VIEW", "BAD_TABLE"), BASELINE_TABLES, Set.of("vw_sample", "bad_view"), NO_TYPES, true))
                .anyMatch(problem -> problem.startsWith("테이블명 'BAD_TABLE'"))
                .noneMatch(problem -> problem.contains("SAMPLE") || problem.contains("sample"))
                .noneMatch(problem -> problem.contains("VIEW") || problem.contains("bad_view"));
    }

    @Test
    @DisplayName("JDBC 타입을 규칙 표기로 옮겨 벤더 타입 이름에 묶이지 않는다")
    void jdbcTypesBecomeRuleTypes() {
        assertThat(SchemaConformanceRules.physicalType(Types.NUMERIC, "NUMBER", 19, 0)).isEqualTo("NUMERIC(19,0)");
        assertThat(SchemaConformanceRules.physicalType(Types.NUMERIC, "NUMBER", 0, -127)).isEqualTo("NUMERIC");
        assertThat(SchemaConformanceRules.physicalType(Types.VARCHAR, "VARCHAR2", 20, 0)).isEqualTo("VARCHAR(20)");
        assertThat(SchemaConformanceRules.physicalType(Types.NVARCHAR, "nvarchar", 40, 0)).isEqualTo("VARCHAR(40)");
        assertThat(SchemaConformanceRules.physicalType(Types.CHAR, "CHAR", 1, 0)).isEqualTo("CHAR(1)");
        assertThat(SchemaConformanceRules.physicalType(Types.CLOB, "CLOB", 4000, 0)).isEqualTo("TEXT");
        assertThat(SchemaConformanceRules.lengthOf("TEXT")).isEqualTo(SchemaConformanceRules.VARCHAR_UNBOUNDED);
        assertThat(SchemaConformanceRules.physicalType(Types.TIMESTAMP, "TIMESTAMP(6)", 11, 6)).isEqualTo("TIMESTAMP(6)");
    }

    @Table(name = "tb_sample")
    private static class SampleEntity {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "sample_sn") Long id;
        @Column(name = "sample_nm", length = 100) String name;
        @Column(name = "sample_no", precision = 10, scale = 0) @Convert(converter = IntegralStringConverter.class) String number;
    }

    private static List<String> audit(String id, String name, String number) {
        return SchemaConformanceRules.auditEntities(List.of(SampleEntity.class),
                Map.of("tb_sample", Map.of("sample_sn", id, "sample_nm", name, "sample_no", number))).violations();
    }

    @Test
    @DisplayName("실제 컬럼으로 PK 전략·길이 초과·숫자 변환을 판정한다")
    void entityRulesReadCatalogTypes() {
        assertThat(audit("NUMERIC(19,0)", "VARCHAR(100)", "NUMERIC(10,0)")).isEmpty();
        assertThat(audit("VARCHAR(19)", "VARCHAR(100)", "NUMERIC(10,0)")).singleElement().asString().contains("[PK 전략 부적합]");
        assertThat(audit("NUMERIC(19,0)", "VARCHAR(99)", "NUMERIC(10,0)")).singleElement().asString().contains("[길이 초과]");
        assertThat(audit("NUMERIC(19,0)", "TEXT", "NUMERIC(10,0)")).isEmpty();
        assertThat(audit("NUMERIC(19,0)", "VARCHAR(100)", "NUMERIC(7,0)")).singleElement().asString().contains("[숫자 변환 불일치]");
    }

    @Test
    @DisplayName("바이트 길이 컬럼은 엔티티 길이 × 4 를 담지 못할 때만 붉다")
    void byteColumnsAreRedOnlyWhenTheEntityLengthCannotFit() {
        List<Class<?>> entities = List.of(SampleEntity.class);
        assertThat(SchemaConformanceRules.byteLengthProblems(entities, Map.of("tb_sample.sample_nm", 399)))
                .singleElement().asString().contains("[바이트 길이 부족]").contains("length=100").contains("399바이트");
        assertThat(SchemaConformanceRules.byteLengthProblems(entities, Map.of("tb_sample.sample_nm", 100))).hasSize(1);
        assertThat(SchemaConformanceRules.byteLengthProblems(entities, Map.of("tb_sample.sample_nm", 400))).as("최악의 경우에도 들어가면 정상이다").isEmpty();
        assertThat(SchemaConformanceRules.byteLengthProblems(entities, Map.of())).as("글자 수 컬럼과 기준선의 바이트 컬럼은 호출자가 뺀다").isEmpty();
        assertThat(SchemaConformanceRules.byteLengthProblems(entities, Map.of("tb_sample.sample_sn", 1, "tb_other.sample_nm", 1))).as("문자열 필드가 아니거나 매핑되지 않은 컬럼은 보지 않는다").isEmpty();
    }

    @Test
    @DisplayName("표나 컬럼의 부재는 Hibernate validate 몫이라 대조 수에만 영향을 준다")
    void absenceIsLeftToHibernateValidate() {
        var audit = SchemaConformanceRules.auditEntities(List.of(SampleEntity.class), Map.of("tb_sample", Map.of("sample_nm", "VARCHAR(100)")));
        assertThat(audit.violations()).isEmpty();
        assertThat(audit.checkedColumns()).isEqualTo(1);
        assertThat(SchemaConformanceRules.auditEntities(List.of(SampleEntity.class), Map.of()).checkedColumns()).isZero();
    }

    @Test
    @DisplayName("새 유니크의 미러 누락만 붉고, 기준선의 어댑터 파생 유니크와 미러 없는 표는 보지 않는다")
    void onlyNewUniquesNeedAMirror() {
        EntityMirror mirror = new EntityMirror("Sample");
        mirror.idColumns.add("sample_sn");
        mirror.singleUniqueColumns.add("sample_nm");
        mirror.tableUniqueSets.add(Set.of("sample_a", "sample_b"));
        Map<String, EntityMirror> mirrors = Map.of("tb_sample", mirror);
        Set<String> baseline = Set.of("tb_sample.uk_sample_hash");
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_sample", Map.of(
                "uk_sample_hash", Set.of("sample_nm_hash"),
                "pk_new", Set.of("sample_sn"),
                "uk_single", Set.of("sample_nm"),
                "uk_pair", Set.of("sample_a", "sample_b")),
                "tb_no_entity", Map.of("uk_other", Set.of("x"))), baseline, Map.of())).isEmpty();
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_sample", Map.of("uk_new", Set.of("sample_c"))), baseline, Map.of()))
                .singleElement().asString().contains("JPA 미러 없음").contains("uk_new");
    }

    @Test
    @DisplayName("이름 없이 만든 유니크도 기준선에 없으면 새 유니크다")
    void unnamedUniqueIsStillNew() {
        EntityMirror mirror = new EntityMirror("Sample");
        assertThat(SchemaConformanceRules.mirrorProblems(Map.of("tb_sample", mirror),
                Map.of("tb_sample", Map.of("sys_c0012345", Set.of("sample_c"))), Set.of(), Map.of())).hasSize(1);
    }

    @Test
    @DisplayName("복합 기본키는 @Id 필드가 없어도 미러를 요구하지 않고, 기본키와 컬럼이 다른 유니크는 그대로 붉다")
    void compositePrimaryKeyNeedsNoMirror() {
        Map<String, EntityMirror> mirrors = Map.of("tb_composite", new EntityMirror("CompositeEntity"));
        Map<String, Set<String>> primaryKeys = Map.of("tb_composite", Set.of("a", "b"));
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_composite", Map.of("primary", Set.of("a", "b"))), Set.of(), primaryKeys)).isEmpty();
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_composite", Map.of("uk_abc", Set.of("a", "b", "c"))), Set.of(), primaryKeys))
                .singleElement().asString().contains("JPA 미러 없음").contains("uk_abc");
    }

    @Test
    @DisplayName("기준선은 표까지 묶어 본다 — 다른 표의 같은 이름과 기준선 목록에서 빠진 유니크는 새 유니크다")
    void baselineIsKeyedByTable() {
        Map<String, EntityMirror> mirrors = Map.of("tb_composite", new EntityMirror("CompositeEntity"));
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_composite", Map.of("uk_same", Set.of("c"))), Set.of("tb_other.uk_same"), Map.of()))
                .singleElement().asString().contains("uk_same");
        assertThat(SchemaConformanceRules.mirrorProblems(mirrors, Map.of("tb_composite", Map.of("uk_old", Set.of("c"))), Set.of("tb_composite.uk_old"), Map.of())).isEmpty();
    }

    @Test
    @DisplayName("함수 인덱스의 식에서 컬럼을 읽어 복합 NULL 허용 유니크도 미러와 맞춘다")
    void expressionColumnsComeFromQuotedNames() {
        assertThat(SchemaConformanceRules.expressionColumns("CASE  WHEN (\"NOTE_TTL\" IS NOT NULL AND \"FRST_RGTR_ID\" IS NOT NULL) THEN \"NOTE_TTL\" END"))
                .containsExactly("frst_rgtr_id", "note_ttl");
        assertThat(SchemaConformanceRules.expressionColumns("SYSDATE")).isEmpty();
    }

    @Test
    @DisplayName("기본 그룹과 초기 부여는 양방향으로 대조한다")
    void grantsAreComparedBothWays() {
        assertThat(SchemaConformanceRules.grantProblems(Set.of("ROLE_ADMIN/A"), Set.of("ROLE_ADMIN/A"))).isEmpty();
        assertThat(SchemaConformanceRules.grantProblems(Set.of("ROLE_ADMIN/A", "ROLE_USER/A"), Set.of("ROLE_ADMIN/A")))
                .singleElement().asString().contains("defaultGroups 에 있는데").contains("ROLE_USER/A");
        assertThat(SchemaConformanceRules.grantProblems(Set.of("ROLE_ADMIN/A"), Set.of("ROLE_ADMIN/A", "ROLE_USER/B")))
                .singleElement().asString().contains("벤더 DB 에 부여가 있는데").contains("ROLE_USER/B");
    }

    /** 기본 스키마 관리 도구로 뜬 문맥의 판정. 도구 이름은 Hibernate 클래스에서 읽어, 확장이 적은 이름이 낡으면 통과 사례가 붉다. */
    private static SchemaCheck hibernate(Map<String, ?> settings) {
        return VendorOwnershipExtension.schemaCheck(settings, HibernateSchemaManagementTool.class.getName());
    }

    @Test
    @DisplayName("벤더 실행이 강제한 hbm2ddl.auto=validate 만 있거나 JPA database action 도 validate 면 통과하고 validate 를 남긴다")
    void hibernateValidatePasses() {
        SchemaCheck check = hibernate(Map.of("hibernate.hbm2ddl.auto", "validate"));
        assertThat(check.problems()).isEmpty();
        assertThat(check.reported()).isEqualTo("validate");
        assertThat(hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "jakarta.persistence.schema-generation.database.action", "validate")).problems()).isEmpty();
    }

    @Test
    @DisplayName("JPA database action 은 hbm2ddl.auto=validate 보다 앞서므로 none 이면 검증을 건너뛴 것으로 붉고 none 을 남긴다")
    void jpaDatabaseActionWinsOverHbm2ddl() {
        for (String key : List.of("jakarta.persistence.schema-generation.database.action", "javax.persistence.schema-generation.database.action")) {
            SchemaCheck check = hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", key, "none"));
            assertThat(check.databaseAction()).as(key).isEqualTo("none");
            assertThat(check.reported()).as(key).isEqualTo("rejected:none");
            assertThat(check.problems()).as(key).anyMatch(problem -> problem.startsWith("기여자 orm의 데이터베이스 동작이 none 다"));
        }
    }

    @Test
    @DisplayName("기여자 접미 키는 같은 키보다 앞서고, 접미 키가 없는 기여자(Envers 등)는 루트 값을 받는다")
    void contributorKeysAreJudgedPerContributor() {
        SchemaCheck orm = hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "jakarta.persistence.schema-generation.database.action.orm", "none"));
        assertThat(orm.databaseAction()).isEqualTo("none|validate");
        assertThat(orm.problems()).singleElement().asString().startsWith("기여자 orm의 데이터베이스 동작이 none 다");
        assertThat(hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.hbm2ddl.auto.envers", "update")).problems())
                .singleElement().asString().startsWith("기여자 envers의 데이터베이스 동작이 update 다");
        assertThat(hibernate(Map.of("hibernate.hbm2ddl.auto", "none", "hibernate.hbm2ddl.auto.orm", "validate")).problems())
                .singleElement().asString().startsWith("기여자별 키가 없는 기여자의 데이터베이스 동작이 none 다");
    }

    @Test
    @DisplayName("scripts action 이 있으면 hbm2ddl.auto 가 버려지고, database action 이 validate 여도 스크립트 동작이 붉다")
    void scriptsActionIsRejected() {
        SchemaCheck dropped = hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "jakarta.persistence.schema-generation.scripts.action", "create"));
        assertThat(dropped.databaseAction()).isEqualTo("none");
        assertThat(dropped.problems()).anyMatch(problem -> problem.startsWith("기여자 orm의 scripts action 이 create-only 다"));
        SchemaCheck explicit = hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "jakarta.persistence.schema-generation.database.action", "validate",
                "javax.persistence.schema-generation.scripts.action", "drop-and-create"));
        assertThat(explicit.databaseAction()).isEqualTo("validate");
        assertThat(explicit.reported()).as("통과하지 못한 문맥은 validate 로 읽히지 않는다").isEqualTo("rejected:validate");
        assertThat(hibernate(Map.of()).reported()).as("아무 키도 없으면 검증이 돌지 않는다").isEqualTo("rejected:none");
    }

    @Test
    @DisplayName("스키마 관리 도구를 바꾸거나 검사할 표를 거르면 validate 라는 이름이 남아도 붉다")
    void schemaToolChangesAreRejected() {
        assertThat(hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.schema_management_tool", "x.Tool")).problems())
                .containsExactly("hibernate.schema_management_tool 이 스키마 관리 도구나 검사할 표를 바꾼다");
        assertThat(hibernate(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.hbm2ddl.schema_filter_provider", "x.Filter")).problems())
                .containsExactly("hibernate.hbm2ddl.schema_filter_provider 이 스키마 관리 도구나 검사할 표를 바꾼다");
        SchemaCheck discovered = VendorOwnershipExtension.schemaCheck(Map.of("hibernate.hbm2ddl.auto", "validate"), "x.DiscoveredTool");
        assertThat(discovered.problems()).containsExactly("스키마 관리 도구가 x.DiscoveredTool 다(Hibernate 기본 도구의 검증이어야 한다)");
        assertThat(discovered.reported()).isEqualTo("rejected:validate");
    }
}
