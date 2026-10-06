package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 🐘 실 PostgreSQL 스키마 검증 게이트 — "테스트는 운영 스키마를 본 적이 없다" 를 끝낸다.
 *
 * <p>[근거] 2026-07-26 사고에서 엔티티 69종의 PK 전략이 일괄 변경됐는데 컴파일·테스트가 모두 그린이었다.
 * 단위 테스트 프로파일이 <b>H2 + {@code ddl-auto: create-drop}</b> 이라 Hibernate 가 엔티티 정의대로
 * 스키마를 새로 만들기 때문이다 — 즉 그 그린은 "엔티티가 엔티티와 일치한다" 는 동어반복이었다.
 *
 * <p>이 테스트는 반대로 간다.
 * <ol>
 *   <li>빈 PostgreSQL 17 컨테이너를 띄우고(Testcontainers)</li>
 *   <li><b>실제 Flyway 마이그레이션 전량</b>을 적용한 뒤</li>
 *   <li><b>{@code ddl-auto: validate}</b> 로 전 엔티티 매핑을 Hibernate 에게 대조시킨다.</li>
 * </ol>
 * 컨텍스트가 뜨는 것 자체가 검증이다 — 매핑이 물리 스키마와 어긋나면 {@code SchemaManagementException}
 * 으로 부팅이 실패한다. 오프라인 린터({@code EntitySchemaConformanceLinterTest})가 잡지 못하는
 * 타입 계열 불일치·시퀀스 부재·정밀도까지 Hibernate 자신이 판정한다.
 *
 * <p><b>계층</b>: Docker 의존이라 pre-push 가 아니라 {@code ./gradlew :api-server:schemaValidationTest}
 * (= {@code localGate}·CI) 계층이다. 기본 {@code test} 태스크에서는 {@code schema-validation} 태그로
 * 제외돼 Docker 없는 환경의 일반 테스트를 깨지 않는다 — 다만 <b>조용히 스킵되는 것이 아니라
 * 전용 태스크에서 반드시 실행</b>되며, Docker 가 없으면 그 태스크는 실패한다(무음 통과 금지).
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("🐘 실 PostgreSQL + Flyway 전량 적용 후 엔티티 매핑 검증(ddl-auto: validate)")
class SchemaValidationIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Flyway 마이그레이션이 실 PostgreSQL 에 적용되고 전 엔티티 매핑이 검증된다")
    void migrationsApplyAndEntitiesValidateAgainstRealPostgres() throws SQLException {
        // 이 메서드가 실행됐다는 것은 Flyway → 명시적 Contract 리허설 → 배리어 → Hibernate validate가 통과했다는 뜻이다.
        // (실패 시 ApplicationContext 로딩 단계에서 SchemaManagementException 으로 죽는다.)
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {

            String product = conn.getMetaData().getDatabaseProductName();
            assertThat(product)
                    .as("H2 로 폴백되면 create-drop 시절과 같은 거짓 안전이 된다 — 반드시 실 PostgreSQL 이어야 한다")
                    .isEqualTo("PostgreSQL");

            // 게이트 무결성(false-green 방지): 마이그레이션이 실제로 적용됐는지 이력으로 확인
            int applied = 0;
            try (ResultSet rs = st.executeQuery(
                    "SELECT count(*) FROM flyway_schema_history WHERE success = true")) {
                if (rs.next()) {
                    applied = rs.getInt(1);
                }
            }
            assertThat(applied)
                    .as("Flyway 적용 건수가 비정상 — 마이그레이션이 실제로 실행되지 않았다면 validate 는 무의미하다")
                    .isGreaterThanOrEqualTo(nuri.api.harness.ReusableHarnessProfile.current().count("migrations", 20));

            int tables = 0;
            try (ResultSet rs = st.executeQuery(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")) {
                if (rs.next()) {
                    tables = rs.getInt(1);
                }
            }
            assertThat(tables)
                    .as("물리 테이블 수가 비정상 — 스키마가 비어 있으면 validate 통과는 vacuous 하다")
                    .isGreaterThanOrEqualTo(nuri.api.harness.ReusableHarnessProfile.current().count("schemaTables", 50));
            try (ResultSet rs=st.executeQuery("SELECT count(*) FROM tb_authrt_chg_hstry "
                    + "WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'")) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getInt(1)).as(nuri.api.harness.ReusableHarnessProfile.current().projected()
                        ? "생성 baseline의 bootstrap provenance가 있어야 한다 — 운영 전환 리허설 증거가 아니다"
                        : "JPA validate 전에 실제 Contract를 수행했어야 한다").isEqualTo(1);
            }
        }
    }

    /** db_columns.json 항목 하나 — 저장 형식은 {table_name, column_name} 배열이다(MappingValidator 계약). */
    private static final Pattern CATALOG_ENTRY = Pattern.compile(
            "\\{\\s*\"table_name\"\\s*:\\s*\"([^\"]+)\"\\s*,\\s*\"column_name\"\\s*:\\s*\"([^\"]+)\"\\s*\\}");
    /*
      재생성 스위치. 패키지 이름을 넣지 않는다 — 넣으면 rename-project.ps1 이 코드의 키는 바꾸고 '-D' 바로 뒤에 붙은
      안내 문구의 키는 바꾸지 않아, 이름을 바꾼 프로젝트에서 안내대로 실행해도 파일이 다시 써지지 않는다.
    */
    private static final String WRITE_PROPERTY = "dbColumns.write";
    private static final String REGENERATE = "./gradlew :api-server:schemaValidationTest "
            + "--tests '*SchemaValidationIntegrationTest' -D" + WRITE_PROPERTY + "=true";

    /**
     * [2026-10-07] 이관 도구의 표준 스키마 카탈로그({@code db_columns.json})는 MappingValidator 가 매핑 타깃의
     * 실재를 판정하는 기준이다. 종전에는 다시 만드는 생성기가 없어 2026-08-19 이후 양방향으로 낡았다 —
     * 인가·결재 표 17개가 없어 그 표로의 매핑이 검증 단계에서 거부됐고, 지운 표는 남아 있었다.
     * 이 테스트가 Flyway 전량 적용 스키마(public 기본 테이블 전체)와 대조하고, {@code -DdbColumns.write=true}
     * 일 때만 같은 질의 결과로 파일을 다시 쓴다(손으로 고치지 않는다).
     *
     * <p>재사용 base 투영본은 원본 카탈로그를 그대로 복사하고 스키마는 프로필에 따라 표가 빠지거나(축소)
     * 늘어난다(custom). 그래서 투영본에서는 양쪽에 모두 있는 표의 컬럼 집합만 같아야 한다.
     */
    @Test
    @DisplayName("이관 표준 스키마 카탈로그(db_columns.json)가 Flyway 적용 스키마와 일치한다")
    void migrationColumnCatalogMatchesMigratedSchema() throws SQLException, IOException {
        Map<String, Set<String>> actual = new TreeMap<>();
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT c.table_name, c.column_name FROM information_schema.columns c "
                     + "JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name "
                     + "WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' "
                     + "ORDER BY c.table_name, c.ordinal_position")) {
            while (rs.next()) {
                actual.computeIfAbsent(rs.getString(1), table -> new LinkedHashSet<>()).add(rs.getString(2));
            }
        }
        assertThat(actual).as("information_schema 질의가 비었다 — 대조가 vacuous 하다").isNotEmpty();

        Path catalog = repoRoot().resolve("db_columns.json");
        if (Boolean.getBoolean(WRITE_PROPERTY)) {
            Files.writeString(catalog, render(actual), StandardCharsets.UTF_8);
        }
        Map<String, Set<String>> expected = new TreeMap<>();
        Matcher entry = CATALOG_ENTRY.matcher(Files.readString(catalog, StandardCharsets.UTF_8));
        while (entry.find()) {
            expected.computeIfAbsent(entry.group(1), table -> new LinkedHashSet<>()).add(entry.group(2));
        }
        assertThat(expected).as("db_columns.json 에서 항목을 읽지 못했다: " + catalog).isNotEmpty();

        boolean projected = nuri.api.harness.ReusableHarnessProfile.current().projected();
        List<String> drift = new ArrayList<>();
        Set<String> tables = new TreeSet<>(actual.keySet());
        tables.addAll(expected.keySet());
        for (String table : tables) {
            Set<String> inSchema = actual.get(table);
            Set<String> inCatalog = expected.get(table);
            if (inSchema == null || inCatalog == null) {
                if (!projected) {
                    drift.add(table + (inSchema == null ? ": 스키마에 없는 표가 카탈로그에 있다" : ": 카탈로그에 없는 표다"));
                }
                continue;
            }
            Set<String> missing = new TreeSet<>(inSchema);
            missing.removeAll(inCatalog);
            Set<String> stale = new TreeSet<>(inCatalog);
            stale.removeAll(inSchema);
            if (!missing.isEmpty() || !stale.isEmpty()) {
                drift.add(table + ": 카탈로그 누락 " + missing + ", 스키마에 없는 컬럼 " + stale);
            }
        }
        assertThat(drift)
                .as("db_columns.json 이 Flyway 적용 스키마와 다르다 — 손으로 고치지 말고 다시 만든다: " + REGENERATE)
                .isEmpty();
    }

    private static String render(Map<String, Set<String>> columns) {
        StringBuilder json = new StringBuilder("[\n");
        boolean first = true;
        for (Map.Entry<String, Set<String>> table : columns.entrySet()) {
            for (String column : table.getValue()) {
                if (!first) {
                    json.append(",\n");
                }
                first = false;
                json.append("  {\n    \"table_name\": \"").append(table.getKey())
                        .append("\",\n    \"column_name\": \"").append(column).append("\"\n  }");
            }
        }
        return json.append("\n]\n").toString();
    }

    private static Path repoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        for (int depth = 0; depth < 6 && current != null; depth += 1) {
            if (Files.isRegularFile(current.resolve("settings.gradle"))
                    && Files.isRegularFile(current.resolve("db_columns.json"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("저장소 루트(db_columns.json)를 찾을 수 없다 — 조용한 skip 은 false-green 이다: "
                + Paths.get("").toAbsolutePath());
    }
}
