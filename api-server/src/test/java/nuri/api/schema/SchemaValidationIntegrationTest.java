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
     * <p>재사용 base 투영본도 정확히 같아야 한다. 생성기가 DB 번들이 검증한 스키마로 카탈로그를 다시 쓴다(설계서 B12,
     * {@code scripts/reusable-migration-catalog.mjs}). 종전에는 원본 카탈로그를 그대로 복사하고 이 대조를 양쪽에 있는 표로
     * 좁혀, 구성에서 빠진 표로 가는 매핑이 이관 검증을 통과하고 적재 직전에야 실패했다.
     */
    /**
     * [2026-11-25 V2_156·V2_157·V2_158] 새 DB 에 적용한 결과를 본다 — 게시글 검색 trigram 인덱스 셋이 유효한 GIN 으로 있고(확장이 있을 때),
     * 사용자 편집 버전 CHECK 가 V2_158 로 검증된 상태다. V2_157 이 확장을 건너뛸 수 있는 환경(확장 없음)은 인덱스를 묻지 않는다.
     */
    @Test
    @DisplayName("게시글 검색 trigram 인덱스는 유효한 GIN 이고 사용자 편집 버전 CHECK 는 검증된 상태다")
    void searchIndexesAndEditVersionCheckAreInPlace() throws SQLException {
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery(
                    "SELECT convalidated FROM pg_constraint WHERE conname = 'ck_tb_user_info_version' AND conrelid = 'tb_user_info'::regclass")) {
                assertThat(rs.next()).as("V2_156 의 CHECK 가 있어야 한다").isTrue();
                assertThat(rs.getBoolean(1)).as("V2_158 이 기존 행까지 검증해야 한다").isTrue();
            }
            // 게시판 기능을 뺀 재사용 생성물에는 tb_bbs_item 이 없다 — 그때는 검색 인덱스를 묻지 않는다.
            boolean trigram;
            try (ResultSet rs = st.executeQuery(
                    "SELECT count(*) FROM pg_extension WHERE extname = 'pg_trgm' AND to_regclass('tb_bbs_item') IS NOT NULL")) {
                rs.next();
                trigram = rs.getInt(1) == 1;
            }
            if (!trigram) {
                return;
            }
            try (ResultSet rs = st.executeQuery("""
                    SELECT ic.relname, i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid)
                      FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
                     WHERE i.indrelid = 'tb_bbs_item'::regclass AND ic.relname LIKE 'ix_tb_bbs_item_%_trgm'
                     ORDER BY ic.relname""")) {
                java.util.List<String> names = new java.util.ArrayList<>();
                while (rs.next()) {
                    names.add(rs.getString(1));
                    assertThat(rs.getBoolean(2) && rs.getBoolean(3)).as(rs.getString(1) + " 은 유효해야 한다").isTrue();
                    assertThat(rs.getString(4)).as(rs.getString(1)).contains("USING gin (").contains("gin_trgm_ops)");
                }
                assertThat(names).containsExactly(
                        "ix_tb_bbs_item_pst_cn_trgm", "ix_tb_bbs_item_pst_ttl_trgm", "ix_tb_bbs_item_user_nm_trgm");
            }
        }
    }

    /**
     * [2026-11-25 Codex 2차] V2_157 본문을 같은 DB 에 다시 돌려 경계 상황을 본다. 각 상황은 트랜잭션 안에서 만들고 되돌린다(PostgreSQL
     * DDL 은 트랜잭션에 묶인다 — 다른 시험에 남지 않는다). 카탈로그 조작(pg_index·pg_class)은 시험 컨테이너의 superuser 로만 한다.
     */
    @Test
    @DisplayName("🚨 V2_157 은 유효한 같은 인덱스는 건너뛰고, 쓸 수 없거나 정의가 다른 같은 이름·게시글이 많은 표에서는 멈추며, 적으면 만든다")
    void trigramMigrationGuardsUnusableIndexesAndLargeTables() throws Exception {
        // 재사용 생성물은 V2 체인 대신 기준선 덤프(V1_0__baseline)로 스키마를 만든다 — V2_157 본문이 없으니 원본 저장소에서만 본다.
        if (Files.isRegularFile(repoRoot().resolve("reusable-base-lock.json"))) {
            return;
        }
        String script;
        try (var in = getClass().getClassLoader().getResourceAsStream("db/migration/V2_157__index_board_post_search_trgm.sql")) {
            assertThat(in).as("V2_157 이 classpath 에 있어야 한다").isNotNull();
            script = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            try (ResultSet rs = st.executeQuery("SELECT count(*) FROM pg_extension WHERE extname = 'pg_trgm'")) {
                rs.next();
                if (rs.getInt(1) != 1) {
                    return; // 확장이 없는 환경은 V2_157 이 인덱스를 건너뛴다 — 위 시험이 그 경로를 본다.
                }
            }
            conn.setAutoCommit(false);
            try {
                // (가) 유효한 같은 인덱스가 이미 있다 — 생성문 없이 통과한다.
                st.execute(script);
                conn.rollback();

                // (나) 같은 이름인데 정의가 다르다(B-tree) — 멈춘다.
                st.execute("DROP INDEX ix_tb_bbs_item_pst_ttl_trgm");
                st.execute("CREATE INDEX ix_tb_bbs_item_pst_ttl_trgm ON tb_bbs_item (pst_ttl)");
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> st.execute(script)).hasMessageContaining("정의가 다릅니다");
                conn.rollback();

                // (다) 같은 이름이 INVALID(CONCURRENTLY 실패 잔여) — 멈춘다(IF NOT EXISTS 로 건너뛰어 성공 이력만 남기지 않는다).
                st.execute("UPDATE pg_index SET indisvalid = false WHERE indexrelid = 'ix_tb_bbs_item_user_nm_trgm'::regclass");
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> st.execute(script)).hasMessageContaining("INVALID");
                conn.rollback();

                // (라) 하나가 없는데 게시글이 많다(추정 60,000행) — 쓰기를 막는 생성 대신 멈추고 사전 생성을 요구한다.
                st.execute("DROP INDEX ix_tb_bbs_item_pst_cn_trgm");
                st.execute("UPDATE pg_class SET reltuples = 60000 WHERE oid = 'tb_bbs_item'::regclass");
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> st.execute(script)).hasMessageContaining("게시글이 많아");
                conn.rollback();

                // (마) 하나가 없고 게시글이 적다 — 만든다.
                st.execute("DROP INDEX ix_tb_bbs_item_pst_cn_trgm");
                st.execute(script);
                try (ResultSet rs = st.executeQuery(
                        "SELECT indisvalid FROM pg_index WHERE indexrelid = 'ix_tb_bbs_item_pst_cn_trgm'::regclass")) {
                    assertThat(rs.next() && rs.getBoolean(1)).as("다시 만든 본문 인덱스는 유효해야 한다").isTrue();
                }
            } finally {
                conn.rollback();
                conn.setAutoCommit(true);
            }
        }
    }

    @Test
    @DisplayName("이관 표준 스키마 카탈로그(db_columns.json)가 Flyway 적용 스키마와 일치한다")
    void migrationColumnCatalogMatchesMigratedSchema() throws SQLException, IOException {
        Path root = repoRoot();
        if (Files.isRegularFile(root.resolve("reusable-base-lock.json"))
                && !Files.isDirectory(root.resolve("migration-tool"))) {
            assertThat(Files.exists(root.resolve("db_columns.json")))
                    .as("ADR-0062: migration-tool 이 제외된 생성 프로젝트에는 db_columns.json 도 남아선 안 된다")
                    .isFalse();
            return;
        }
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

        Path catalog = root.resolve("db_columns.json");
        if (Boolean.getBoolean(WRITE_PROPERTY)) {
            Files.writeString(catalog, render(actual), StandardCharsets.UTF_8);
        }
        Map<String, Set<String>> expected = new TreeMap<>();
        Matcher entry = CATALOG_ENTRY.matcher(Files.readString(catalog, StandardCharsets.UTF_8));
        while (entry.find()) {
            expected.computeIfAbsent(entry.group(1), table -> new LinkedHashSet<>()).add(entry.group(2));
        }
        assertThat(expected).as("db_columns.json 에서 항목을 읽지 못했다: " + catalog).isNotEmpty();

        List<String> drift = new ArrayList<>();
        Set<String> tables = new TreeSet<>(actual.keySet());
        tables.addAll(expected.keySet());
        for (String table : tables) {
            Set<String> inSchema = actual.get(table);
            Set<String> inCatalog = expected.get(table);
            if (inSchema == null || inCatalog == null) {
                drift.add(table + (inSchema == null ? ": 스키마에 없는 표가 카탈로그에 있다" : ": 카탈로그에 없는 표다"));
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
                    && Files.isRegularFile(current.resolve("build.gradle"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("저장소 루트(settings.gradle/build.gradle)를 찾을 수 없다 — 조용한 skip 은 false-green 이다: "
                + Paths.get("").toAbsolutePath());
    }
}
