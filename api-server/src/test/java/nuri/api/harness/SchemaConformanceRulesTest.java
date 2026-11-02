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
import nuri.foundation.domain.common.IntegralStringConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * 벤더 카탈로그 시험의 판정을 DB 없이 붉힌다. 그 시험은 벤더 컨테이너가 있어야 돌므로, 판정이 무력해져도 일반 실행에는 드러나지 않는다.
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
    @DisplayName("tb_ 없는 새 표, 감사 컬럼 누락, 표준 밖의 새 제약·인덱스·시퀀스 이름은 붉다")
    void newObjectViolationsAreReported() {
        CatalogNames current = catalog(
                Set.of("tb_a.id", "tb_a.crt_dt", "flyway_schema_history.version", "bad_table.id", "tb_b.id", "tb_b.frst_rgtr_id", "tb_b.crt_dt", "tb_b.mdfcn_dt"),
                Set.of("tb_a.pk_tb_a", "tb_a.tb_a_adapter_named", "bad_table.c_wrong"), Set.of("tb_a.tb_a_legacy_idx", "tb_a.idx_wrong"), Set.of(".legacy_seq", ".seq_wrong"));
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, NO_TYPES, NO_VIEWS))
                .anyMatch(problem -> problem.startsWith("테이블명 'bad_table'"))
                .anyMatch(problem -> problem.contains("'bad_table'") && problem.contains("최소 감사컬럼"))
                .anyMatch(problem -> problem.contains("'tb_b'") && problem.contains("감사컬럼 짝 깨짐"))
                .anyMatch(problem -> problem.startsWith("제약명 'bad_table.c_wrong'"))
                .anyMatch(problem -> problem.startsWith("인덱스명 'tb_a.idx_wrong'"))
                .anyMatch(problem -> problem.startsWith("시퀀스명 'seq_wrong'"));
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
                Set.of("tb_a.id", "tb_a.crt_dt", "flyway_schema_history.version", "vw_sample.id", "bad_view.id", "bad_table.id"),
                BASELINE.constraints(), BASELINE.indexes(), BASELINE.sequences());
        assertThat(SchemaConformanceRules.newObjectProblems(BASELINE, current, NO_TYPES, Set.of("vw_sample", "bad_view")))
                .anyMatch(problem -> problem.startsWith("뷰명 'bad_view'"))
                .anyMatch(problem -> problem.startsWith("테이블명 'bad_table'"))
                .anyMatch(problem -> problem.contains("'bad_table'") && problem.contains("최소 감사컬럼"))
                .noneMatch(problem -> problem.contains("vw_sample"))
                .noneMatch(problem -> problem.contains("'bad_view'") && problem.contains("테이블"));
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
}
