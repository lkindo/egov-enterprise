package nuri.api.schema;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔓 생성 base day-1 관리자 부트스트랩 시드 계약 — {@code R__zz_seed_base_admin.sql}.
 *
 * <p>[근거 — 2026-08-23 파일 수준 실측] reusable-base DB 번들은 {@code pg_dump --schema-only}
 * baseline(V1_0) + 표준용어(V1_1) + {@code R__seed_framework.sql} 만 남기므로, versioned 체인이
 * 심은 메뉴(V2_2)·역할계층(V2_3)·URL 인가 레지스트리(V2_11)가 전부 소실된다. 그 상태에서
 * {@code DbUrlAuthorizationManager} 는 fail-closed 라 {@code /api/v1/admin/**} 전체를
 * ROLE_ADMIN 에게도 거부하고, {@code GET /api/v1/menus} 는 빈 트리를 반환한다 —
 * 관리자가 로그인해도 아무 관리 화면·API 를 쓸 수 없는 day-1 잠금이다.
 *
 * <p>이 계약은 세 방향을 한 번의 full-chain migrate 로 검증한다.
 * <ol>
 *   <li><b>프로필-안전(no-op)</b> — 풀시드(제품) DB 에서 시드를 재실행해도 행 수가 변하지 않는다
 *       (데모 시드·운영 데이터 보존).</li>
 *   <li><b>부트스트랩</b> — 생성 base 상태(시드 대상 테이블 공백)를 재현한 뒤 시드를 실행하면
 *       URL 인가 anchor·최소 메뉴 트리·ROLE_ADMIN 매핑·IDENTITY 채번 안전이 성립한다.</li>
 *   <li><b>경로 계약</b> — 시드된 modern_route 는 전부 core 잔존 화면(frontend 실파일 존재)이고
 *       {@code config/reusable-base-profiles.json} 의 어떤 pack removePaths 에도 걸리지 않는다.</li>
 * </ol>
 */
@Tag("schema-validation")
@DisplayName("생성 base day-1 관리자 부트스트랩 시드 (R__zz_seed_base_admin)")
class BaseAdminBootstrapSeedIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String SEED_RESOURCE = "/db/migration/R__zz_seed_base_admin.sql";

    /** 부트스트랩 트리의 기대 라우트 — 전부 core pack 잔존 화면이어야 한다. */
    private static final Set<String> EXPECTED_LEAF_ROUTES = Set.of(
            "/admin/user/manage",
            "/admin/user/departments",
            "/admin/security/authority",
            "/admin/security/role",
            "/admin/security/group",
            "/admin/system/menus",
            "/admin/system/menus/by-authority",
            "/admin/system/programs",
            "/admin/system/common-code",
            "/admin/system/logs");

    @Test
    @DisplayName("풀시드에선 no-op, 빈 base 에선 URL 인가·메뉴·ROLE_ADMIN 매핑을 부트스트랩한다")
    void bootstrapSeedIsProfileSafeAndUnlocksAdmin() throws Exception {
        flyway(null).migrate();
        String seedSql = readSeedSql();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {

            // ── 1. 프로필-안전: 풀시드 DB 재실행은 어떤 시드 대상 테이블도 바꾸지 않는다 ──
            Map<String, Long> before = snapshotSeedTargets(statement);
            statement.execute(seedSql);
            Map<String, Long> after = snapshotSeedTargets(statement);
            assertThat(after)
                    .as("풀시드(제품) DB 에서 부트스트랩 시드는 no-op 이어야 한다 — 데모/운영 상태 보존")
                    .isEqualTo(before);

            // ── 2. 생성 base 상태 재현: schema-only baseline 이 소거하는 데이터를 비운다 ──
            statement.executeUpdate("DELETE FROM tb_menu_crt_dtl");
            statement.executeUpdate("DELETE FROM tb_menu_info");
            statement.executeUpdate("DELETE FROM tb_role_prgrm_map");
            statement.executeUpdate("DELETE FROM tb_prgrm_lst");
            statement.executeUpdate("DELETE FROM tb_authrt_role_map");
            statement.executeUpdate("DELETE FROM tb_authrt_info");
            statement.executeUpdate("DELETE FROM tb_role_hierarchy");
            statement.executeUpdate("DELETE FROM tb_role_info WHERE role_id='ROLE_SYSTEM'");
            statement.execute("SELECT setval('sq_menu_sn', 1, false)");

            // ── 3. 부트스트랩: 시드 1회 실행으로 day-1 잠금 두 겹이 모두 풀린다 ──
            statement.execute(seedSql);

            // 3a. URL 인가 anchor — DbUrlAuthorizationManager fail-closed 해제 조건
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_prgrm_lst WHERE prgrm_file_nm='ADMIN_ALL' AND url='/api/v1/admin/**'"))
                    .as("secure-paths /api/v1/admin/** 의 URL 인가 프로그램 행")
                    .isEqualTo(1L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_role_prgrm_map rpm "
                            + "JOIN tb_prgrm_lst p ON p.prgrm_file_nm = rpm.prgrm_file_nm "
                            + "WHERE rpm.role_id IN ('ROLE_ADMIN','ROLE_SYSTEM') AND p.url='/api/v1/admin/**'"))
                    .as("ROLE_ADMIN/ROLE_SYSTEM → /api/v1/admin/** 매핑 (없으면 관리자도 전부 403)")
                    .isEqualTo(2L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_role_prgrm_map rpm "
                            + "JOIN tb_prgrm_lst p ON p.prgrm_file_nm = rpm.prgrm_file_nm "
                            + "WHERE rpm.role_id IN ('ROLE_ADMIN','ROLE_SYSTEM') AND p.url='/actuator/**'"))
                    .as("ROLE_ADMIN/ROLE_SYSTEM → /actuator/** 매핑")
                    .isEqualTo(2L);

            // 3b. 권한/역할 마스터와 계층 — FK 성립과 상속 의미
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_authrt_info WHERE authrt_cd IN ('ROLE_ADMIN','ROLE_SYSTEM','ROLE_USER')"))
                    .isEqualTo(3L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_role_info WHERE role_id='ROLE_SYSTEM'"))
                    .isEqualTo(1L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_role_hierarchy WHERE (higher_authrt,lower_authrt) IN "
                            + "(('ROLE_SYSTEM','ROLE_ADMIN'),('ROLE_ADMIN','ROLE_USER'))"))
                    .isEqualTo(2L);

            // 3c. 메뉴 트리 — 루트 1 + 잎 10, 전부 사용중·미삭제, GET /api/v1/menus 비공백의 DB 전제
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE up_menu_sn IS NULL AND use_yn='Y' AND del_yn='N'"))
                    .as("부트스트랩 루트 메뉴")
                    .isEqualTo(1L);
            List<String> leafRoutes = stringColumn(statement,
                    "SELECT modern_route FROM tb_menu_info WHERE up_menu_sn IS NOT NULL ORDER BY menu_ordr");
            assertThat(new TreeSet<>(leafRoutes))
                    .as("잎 메뉴 라우트는 core 잔존 화면 집합과 정확히 일치해야 한다")
                    .isEqualTo(new TreeSet<>(EXPECTED_LEAF_ROUTES));
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE use_yn <> 'Y' OR del_yn <> 'N'"))
                    .isZero();

            // 3d. 모든 부트스트랩 메뉴는 ROLE_ADMIN 매핑을 갖는다 (그리고 ROLE_ADMIN 뿐이다 — V2_36 의미)
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info m WHERE NOT EXISTS "
                            + "(SELECT 1 FROM tb_menu_crt_dtl d WHERE d.menu_sn = m.menu_sn AND d.authrt_cd='ROLE_ADMIN')"))
                    .as("ROLE_ADMIN 매핑 없는 메뉴")
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_crt_dtl WHERE authrt_cd <> 'ROLE_ADMIN'"))
                    .as("관리 메뉴에 ROLE_ADMIN 외 권한 부여 금지")
                    .isZero();

            // 3e. IDENTITY 채번 안전 — 명시 번호 시드 뒤 신규 메뉴 자동 채번이 충돌하지 않는다
            long maxSeeded = singleLong(statement, "SELECT max(menu_sn) FROM tb_menu_info");
            long generated;
            try (ResultSet inserted = statement.executeQuery(
                    "INSERT INTO tb_menu_info (menu_nm, menu_ordr, modern_route) "
                            + "VALUES ('부트스트랩 이후 신규', 99, '/generated-after-bootstrap') RETURNING menu_sn")) {
                assertThat(inserted.next()).isTrue();
                generated = inserted.getLong(1);
            }
            assertThat(generated).isGreaterThan(maxSeeded);

            // ── 4. 멱등: 한 번 더 실행해도 행 수 불변 ──
            Map<String, Long> bootstrapped = snapshotSeedTargets(statement);
            statement.execute(seedSql);
            assertThat(snapshotSeedTargets(statement)).isEqualTo(bootstrapped);
        }

        // ── 5. 경로 계약: 시드 라우트는 전부 core 잔존 화면이다 ──
        assertRoutesSurviveEveryProfile();
    }

    // ---- 경로 계약 -----------------------------------------------------------------

    /**
     * 시드된 모든 라우트가 (a) frontend 실제 페이지 파일로 존재하고,
     * (b) {@code config/reusable-base-profiles.json} 의 어떤 pack {@code removePaths} 에도
     * 걸리지 않음을 단언한다 — 라우트가 demo pack 으로 이동하면 이 계약이 red 가 된다.
     */
    private void assertRoutesSurviveEveryProfile() throws IOException {
        Path repoRoot = resolveRepoRoot();
        Path manifest = repoRoot.resolve("config").resolve("reusable-base-profiles.json");
        JsonNode packs = new ObjectMapper().readTree(manifest.toFile()).path("packs");

        List<String> removePaths = new ArrayList<>();
        packs.forEach(pack -> pack.path("frontend").path("removePaths")
                .forEach(path -> removePaths.add(path.asText())));

        List<String> violations = new ArrayList<>();
        for (String route : EXPECTED_LEAF_ROUTES) {
            String appRelative = "src/app" + route;
            Path page = repoRoot.resolve("frontend").resolve(appRelative).resolve("page.tsx");
            if (!Files.isRegularFile(page)) {
                violations.add(route + ": frontend 페이지 부재 — " + page);
            }
            for (String removed : removePaths) {
                if (appRelative.equals(removed) || appRelative.startsWith(removed + "/")) {
                    violations.add(route + ": 프로필 removePaths 에 포함 — " + removed
                            + " (생성 base 에서 이 라우트가 소거되어 부트스트랩 메뉴가 죽은 링크가 된다)");
                }
            }
        }
        assertThat(violations)
                .as("부트스트랩 라우트는 모든 프로필에서 잔존해야 한다")
                .isEmpty();
    }

    private static Path resolveRepoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        for (int depth = 0; depth < 6 && current != null; depth += 1) {
            if (Files.isRegularFile(current.resolve("config").resolve("reusable-base-profiles.json"))) {
                return current;
            }
            current = current.getParent();
        }
        fail("게이트 무결성 파손: config/reusable-base-profiles.json 을 찾을 수 없습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
        throw new IllegalStateException("unreachable");
    }

    // ---- 유틸 ----------------------------------------------------------------------

    private String readSeedSql() throws IOException {
        try (InputStream stream = getClass().getResourceAsStream(SEED_RESOURCE)) {
            if (stream == null) {
                fail("부트스트랩 시드 파일이 classpath 에 없습니다: " + SEED_RESOURCE
                        + " — 파일 삭제/개명은 생성 base 의 day-1 관리자 잠금을 되살립니다.");
            }
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** 시드가 건드릴 수 있는 모든 테이블의 행 수 스냅샷 — no-op/멱등 판정의 기준. */
    private Map<String, Long> snapshotSeedTargets(Statement statement) throws SQLException {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : List.of(
                "tb_authrt_info", "tb_role_info", "tb_authrt_role_map", "tb_role_hierarchy",
                "tb_prgrm_lst", "tb_role_prgrm_map", "tb_menu_info", "tb_menu_crt_dtl")) {
            counts.put(table, singleLong(statement, "SELECT count(*) FROM " + table));
        }
        return counts;
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private List<String> stringColumn(Statement statement, String sql) throws SQLException {
        List<String> values = new ArrayList<>();
        try (ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                values.add(result.getString(1));
            }
        }
        return values;
    }
}
