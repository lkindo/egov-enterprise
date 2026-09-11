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
 * 생성 base의 핵심 권한 테이블과 최초 관리자 배정을 실제 PostgreSQL에서 검증한다.
 * 전체 제품 전환 후 재실행, schema-only 초기화, 명시 권한 회수 후 재실행을 분리한다.
 */
@Tag("schema-validation")
@DisplayName("생성 base day-1 관리자 부트스트랩 시드 (R__zz_seed_base_admin)")
class BaseAdminBootstrapSeedIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String FRAMEWORK_SEED_RESOURCE = "/db/migration/R__seed_framework.sql";
    private static final String ADMIN_BOOTSTRAP_SEED_RESOURCE = "/db/migration/R__zz_seed_base_admin.sql";

    /** 부트스트랩 트리의 기대 라우트 — 전부 core pack 잔존 화면이어야 한다. */
    private static final Set<String> EXPECTED_LEAF_ROUTES = Set.of(
            "/admin/user/manage",
            "/admin/user/departments",
            "/admin/security/authority",
            "/admin/security/group",
            "/admin/system/menus",
            "/admin/system/menus/by-authority",
            "/admin/system/programs",
            "/admin/system/common-code",
            "/admin/system/logs");

    @Test
    @DisplayName("제품 권한은 보존하고 빈 base에만 초기 명시 권한과 메뉴를 만든다")
    void bootstrapSeedIsProfileSafeAndUnlocksAdmin() throws Exception {
        migrateThroughAuthorizationCutover();
        String frameworkSeedSql = readSeedSql(FRAMEWORK_SEED_RESOURCE);
        String adminBootstrapSeedSql = readSeedSql(ADMIN_BOOTSTRAP_SEED_RESOURCE);
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            Map<String, Long> before = snapshotSeedTargets(statement);
            statement.execute(frameworkSeedSql);
            statement.execute(adminBootstrapSeedSql);
            assertThat(snapshotSeedTargets(statement)).as("전환 완료 제품 DB 재실행은 no-op").isEqualTo(before);

            // 이 클래스 소유 disposable DB에서만 schema-only baseline의 빈 데이터를 재현한다.
            // 운영 Contract는 데이터를 비우지 않으며, 이 fixture 작업은 배포 코드에 존재하지 않는다.
            statement.execute("TRUNCATE tb_authrt_grnt_map,tb_authrt_user_map,tb_authrt_chg_hstry,"
                    + "tb_menu_info,tb_prgrm_lst,tb_authrt_info,tb_user_info RESTART IDENTITY CASCADE");
            statement.execute(frameworkSeedSql);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_info")).isEqualTo(2);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_user_map "
                    + "WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000001' AND authrt_cd='ROLE_ADMIN'")).isEqualTo(1);
            statement.execute(adminBootstrapSeedSql);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_info "
                    + "WHERE authrt_cd IN ('ROLE_ADMIN','ROLE_SYSTEM','ROLE_USER')")).isEqualTo(3);
            assertThat(singleLong(statement,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
                    + "AND table_name IN ('tb_role_info','tb_role_prgrm_map','tb_role_hierarchy','tb_authrt_role_map','tb_user_authrt_map','tb_menu_crt_dtl')")).isZero();
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_type_cd='UPDATE' "
                    + "AND chg_artcl_nm='legacy_authorization_contract'")).isEqualTo(1);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_menu_info WHERE up_menu_sn IS NULL AND use_yn='Y' AND del_yn='N'")).isEqualTo(1);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_menu_info WHERE up_menu_sn IS NULL AND modern_route IS NOT NULL")).isZero();
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_menu_info WHERE modern_route='/admin/security/role'")).isZero();
            assertThat(new TreeSet<>(stringColumn(statement,"SELECT modern_route FROM tb_menu_info WHERE up_menu_sn IS NOT NULL")))
                    .isEqualTo(new TreeSet<>(EXPECTED_LEAF_ROUTES));
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_menu_info WHERE use_yn <> 'Y' OR del_yn <> 'N'")).isZero();
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_menu_info menu WHERE NOT EXISTS "
                    + "(SELECT 1 FROM tb_authrt_grnt_map grant_row WHERE grant_row.authrt_cd='ROLE_ADMIN' "
                    + "AND grant_row.authrt_type_cd='NAVIGATION' AND grant_row.authrt_grnt_cd=menu.menu_sn::text)")).isZero();
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_cd <> 'ROLE_ADMIN'")).isZero();
            assertThat(new TreeSet<>(stringColumn(statement,"SELECT authrt_grnt_cd FROM tb_authrt_grnt_map "
                    + "WHERE authrt_cd='ROLE_ADMIN' AND authrt_type_cd='OPERATION'")))
                    .isEqualTo(new TreeSet<>(nuri.business.security.authorization.PermissionCodes.ALL));

            long maxSeeded = singleLong(statement,"SELECT max(menu_sn) FROM tb_menu_info");
            assertThat(singleLong(statement,"INSERT INTO tb_menu_info(menu_nm,menu_ordr,modern_route) "
                    + "VALUES('초기화 후 신규',99,'/generated-after-bootstrap') RETURNING menu_sn")).isGreaterThan(maxSeeded);
            Map<String, Long> bootstrapped = snapshotSeedTargets(statement);
            statement.execute(frameworkSeedSql);
            statement.execute(adminBootstrapSeedSql);
            assertThat(snapshotSeedTargets(statement)).isEqualTo(bootstrapped);

            // 회수한 OP/NAV/회원 배정은 repeatable checksum 변경 시에도 복구하면 안 된다.
            statement.executeUpdate("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' "
                    + "AND ((authrt_type_cd='OPERATION' AND authrt_grnt_cd='MENU_CREATE') OR authrt_type_cd='NAVIGATION')");
            statement.executeUpdate("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000001'");
            Map<String, Long> revoked = snapshotSeedTargets(statement);
            statement.execute(frameworkSeedSql);
            statement.execute(adminBootstrapSeedSql);
            assertThat(snapshotSeedTargets(statement)).isEqualTo(revoked);
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_user_map")).isZero();
            assertThat(singleLong(statement,"SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' "
                    + "AND authrt_type_cd='OPERATION' AND authrt_grnt_cd='MENU_CREATE'")).isZero();
        }
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

    private String readSeedSql(String resource) throws IOException {
        try (InputStream stream = getClass().getResourceAsStream(resource)) {
            if (stream == null) {
                fail("부트스트랩 시드 파일이 classpath 에 없습니다: " + resource
                        + " — 파일 삭제/개명은 생성 base 의 day-1 관리자 잠금을 되살립니다.");
            }
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** 시드가 건드릴 수 있는 모든 테이블의 행 수 스냅샷 — no-op/멱등 판정의 기준. */
    private Map<String, Long> snapshotSeedTargets(Statement statement) throws SQLException {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : List.of(
                "tb_authrt_info", "tb_authrt_user_map", "tb_authrt_grnt_map", "tb_authrt_chg_hstry",
                "tb_user_info", "tb_com_clsf_cd", "tb_prgrm_lst", "tb_menu_info")) {
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
