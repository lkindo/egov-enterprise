package nuri.api.harness;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import nuri.foundation.domain.common.IntegralStringConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧬 엔티티 ↔ 물리 스키마 정합 린터 — "그린 ≠ 안전" 의 구조적 원인을 제거한다.
 *
 * <p>[근거] 2026-07-26 사고: 엔티티 69종에 {@code @GeneratedValue(UUID)} 가 일괄 부착됐고
 * <b>컴파일·테스트가 모두 그린</b>이었다. 36자 UUID 를 {@code character varying(7)} PK 에 넣는 변경인데도
 * 검출되지 않은 이유는 구조적이다 — 테스트 프로파일이 <b>H2 + {@code ddl-auto: create-drop}</b> 이라
 * Hibernate 가 엔티티 정의대로 스키마를 새로 만든다. 즉 <b>테스트는 운영 스키마를 본 적이 없다.</b>
 *
 * <p>이 린터는 <b>Flyway 델타를 정적으로 재생({@link MigrationSchemaReplay})</b>해 유효 스키마를 구성하고, 엔티티 매핑과 대조한다.
 * DB 연결·Docker 없이 결정론적으로 동작하므로 pre-push 에서 돌릴 수 있다(AGENTS.md Evidence guardrails H5).
 * 라이브 DB 와 마이그레이션의 괴리는 별개 문제이며 Flyway validate 의 영역이다 — 여기서는
 * <b>저장소가 선언한 스키마</b>를 기준으로 삼는다.
 *
 * <p>검사 항목
 * <ol>
 *   <li><b>PK 전략 적합성</b> — {@code @GeneratedValue}(UUID/IDENTITY/SEQUENCE) 가 물리 컬럼 타입·길이에
 *       수용되는가. <i>사고를 직접 잡는 규칙이다.</i></li>
 *   <li><b>길이 초과</b> — {@code @Column(length=N)} 이 물리 {@code varchar(M)} 보다 큰 경우(N&gt;M):
 *       런타임 {@code value too long} 위험</li>
 *   <li><b>부재</b> — 매핑된 테이블/컬럼이 마이그레이션에 존재하지 않음</li>
 * </ol>
 *
 * <p>기존 드리프트는 {@link #KNOWN_DRIFT} 로 동결하고 신규 유입만 차단한다(하네스 관행).
 * 이 목록의 편집은 {@code HarnessBaselineIntegrityTest} 매니페스트에 다시 잡힌다.
 *
 * <p>규칙 본문은 {@link SchemaConformanceRules} 에 있다. 벤더 프로젝트는 Flyway 가 이 입력을 실행하지 않으므로 이 린터를 빼고
 * {@link VendorCatalogConformanceTest} 가 실제 카탈로그로 같은 규칙을 돌린다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(SQL 파싱 + 클래스패스 스캔·리플렉션).
 */
@Tag("governance-harness")
class EntitySchemaConformanceLinterTest {

    private static final Logger log = LoggerFactory.getLogger(EntitySchemaConformanceLinterTest.class);

    private static final String ENTITY_SCAN_BASE = "nuri";

    /**
     * [동결 베이스라인] 린터 최초 실행 census 로 확인된 기존 드리프트. <b>신규 추가 금지</b> —
     * 신규 매핑은 물리 스키마와 일치시키거나 마이그레이션을 추가한다.
     * 형식: {@code 엔티티#필드:사유코드}
     */
    private static final Set<String> KNOWN_DRIFT = new TreeSet<>(Arrays.asList(
            // 최초 실행 census 로 채운다.
            ));

    @Test
    @DisplayName("🧬 엔티티 매핑 ↔ Flyway 물리 스키마 정합 — PK 전략 적합성·길이 초과·부재 차단 (AGENTS.md H1)")
    void auditEntityMappingMatchesPhysicalSchema() throws IOException {
        Map<String, Map<String, String>> schema = MigrationSchemaReplay.replay();

        // 게이트 무결성(false-green 방지): 파싱이 조용히 붕괴하면 모든 대조가 무의미해진다
        if (schema.size() < ReusableHarnessProfile.current().count("schemaTables", 50)) {
            fail("게이트 무결성 파손: 마이그레이션 재생 결과 테이블 수(" + schema.size() + ")가 예상 하한(50) 미만 — SQL 파서/경로 파손 의심.");
        }

        List<String> violations = new ArrayList<>();
        int entities = 0;
        int checkedColumns = 0;

        for (Class<?> clazz : SchemaConformanceRules.entityClasses(ENTITY_SCAN_BASE)) {
            entities++;

            String table = SchemaConformanceRules.tableNameOf(clazz);
            Map<String, String> columns = schema.get(table);
            if (columns == null) {
                violations.add(String.format("%s → 물리 테이블 '%s' 없음 — 마이그레이션 누락 또는 @Table 오타",
                        clazz.getSimpleName(), table));
                continue;
            }

            for (Field field : SchemaConformanceRules.persistentFields(clazz)) {
                String column = SchemaConformanceRules.columnNameOf(field);
                String physicalType = columns.get(column);
                String key = clazz.getSimpleName() + "#" + field.getName();

                if (physicalType == null) {
                    if (!KNOWN_DRIFT.contains(key + ":missing-column")) {
                        violations.add(String.format("%s → %s.%s 물리 컬럼 없음 (필드 %s)",
                                clazz.getSimpleName(), table, column, field.getName()));
                    }
                    continue;
                }
                checkedColumns++;

                for (SchemaConformanceRules.FieldProblem problem : SchemaConformanceRules.fieldProblems(clazz, table, column, field, physicalType)) {
                    if (problem.kind().isEmpty() || !KNOWN_DRIFT.contains(key + ":" + problem.kind())) {
                        violations.add(problem.message());
                    }
                }
            }
        }

        if (entities < 20 || checkedColumns < 200) {
            fail("게이트 무결성 파손: 엔티티 " + entities + "종 / 대조 컬럼 " + checkedColumns
                    + "건 — 스캔 파손 의심(예상 하한 20종·200건).");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧬 [ENTITY↔SCHEMA LINTER] 엔티티 매핑과 물리 스키마의 불일치가 차단되었습니다!\n");
            sb.append("========================================================================\n");
            violations.stream().sorted().forEach(v -> sb.append("❌ ").append(v).append("\n"));
            sb.append("\n💡 테스트 그린은 안전의 증거가 아닙니다 — 테스트 프로파일(H2 + create-drop)은 엔티티 정의대로\n");
            sb.append("   스키마를 새로 만들기 때문에 운영 PostgreSQL 과의 불일치를 원리적으로 검출하지 못합니다.\n");
            sb.append("   해소: ① 매핑을 물리 스키마에 맞추거나 ② Flyway 델타를 추가해 물리 스키마를 바꾸십시오.\n");
            sb.append("   (AGENTS.md Evidence guardrails H1 — db-bridge 실측 결과를 증적으로 제시할 것)\n");
            fail(sb.toString());
        }

        log.info("✅ 엔티티↔물리 스키마 정합 OK — 테이블 {}개 재생, 엔티티 {}종 / 컬럼 {}건 대조(동결 {}건).",
                schema.size(), entities, checkedColumns, KNOWN_DRIFT.size());
    }

    @Test
    @DisplayName("명시 정수 변환기의 문자열은 물리 NUMERIC precision/scale과 일치해야 한다")
    void integralStringMappingChecksPhysicalNumericInsteadOfLength() throws Exception {
        Field field = IntegralStorageFixture.class.getDeclaredField("value");
        org.assertj.core.api.Assertions.assertThat(SchemaConformanceRules.integralStringMatchesPhysicalType(field, "NUMERIC(10,0)")).isTrue();
        org.assertj.core.api.Assertions.assertThat(SchemaConformanceRules.integralStringMatchesPhysicalType(field, "decimal(10, 0)")).isTrue();
        for (String wrong : List.of("VARCHAR(12)", "NUMERIC(7,0)", "NUMERIC(10,1)", "BIGINT", "NUMERIC")) {
            org.assertj.core.api.Assertions.assertThat(SchemaConformanceRules.integralStringMatchesPhysicalType(field, wrong)).as(wrong).isFalse();
        }
    }

    private static class IntegralStorageFixture {
        @Column(precision = 10, scale = 0) @Convert(converter = IntegralStringConverter.class) String value;
    }

    @Test
    @DisplayName("NUMERIC precision/scale의 콤마는 ALTER action 경계가 아니며 USING은 타입에 포함되지 않는다")
    void numericAlterTypeKeepsPrecisionAndScale() {
        Map<String, Map<String, String>> schema = new TreeMap<>();
        MigrationSchemaReplay.applyStatement(schema, "CREATE TABLE sample (priority VARCHAR(12), width VARCHAR(12), height VARCHAR(12))");
        MigrationSchemaReplay.applyStatement(schema, "ALTER TABLE public.sample ALTER COLUMN priority TYPE NUMERIC(10,0) USING priority::NUMERIC(10,0)");
        MigrationSchemaReplay.applyStatement(schema, "ALTER TABLE sample ALTER COLUMN width SET DATA TYPE NUMERIC(7, 0),"
                + " ALTER COLUMN height TYPE NUMERIC(7,0) USING height::NUMERIC(7,0)");
        org.assertj.core.api.Assertions.assertThat(schema.get("sample")).containsExactlyInAnyOrderEntriesOf(Map.of(
                "priority", "NUMERIC(10,0)", "width", "NUMERIC(7, 0)", "height", "NUMERIC(7,0)"));
    }
}
