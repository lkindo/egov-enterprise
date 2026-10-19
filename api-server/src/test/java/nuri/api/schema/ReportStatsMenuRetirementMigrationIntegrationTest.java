package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_134 가 보고서 통계 메뉴(9040105) 행과 그 메뉴 배정·즐겨찾기를 지우고, 지운 배정마다 변경 이력을 남기는지 본다.
 *
 * <p>[왜 필요한가] 같은 변경이 그 메뉴가 여는 '운영 보고서' 탭·라우트·조회 API 를 걷는다(그 원장에 쓰는 제품 경로가 없었다).
 * 메뉴가 남으면 없는 화면을 가리킨다. 반대로 조건이 넓으면 도입 기관이 바꿔 쓰는 행이나 하위를 둔 행을 지운다. V2_125 와
 * 달리 그런 행은 건너뛰지 않고 실패해야 한다 — 같은 릴리스가 라우트를 지우므로 남기면 깨진 메뉴가 된다. 같은 경로를 가리키는
 * 다른 행도 마찬가지다. 이미 지운 환경에서 다시 실행하면 아무것도 바꾸지 않아야 한다. 경우마다 같은 SQL 을 롤백 트랜잭션에서
 * 실행해 대조한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_134 보고서 통계 메뉴 퇴역")
class ReportStatsMenuRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_134__retire_report_stats_menu.sql";
    private static final String REPORT_MENU = "9040105";
    private static final String REPORT_ROUTE = "/admin/stats/report";
    private static final String STATS_SECTION = "9040402";
    /** 같은 섹션의 사용 중 형제 메뉴(화면통계). 대조군이다. */
    private static final String SIBLING_MENU = "9040104";

    /**
     * 적용 시점 권한 원장 버전의 스냅샷. {@code PermissionCodes.CATALOG_VERSION} 과 비교하지 않는다 — 그 상수는 원장이
     * 바뀌면 따라 바뀌지만, 이미 적용된 마이그레이션의 이력 값은 바뀌지 않는다(V2_125 도 리터럴이다).
     */
    private static final String POLICY_VERSION = "a61052901cd6ad46ef41f3620792f1fc8e605a72102cf1061e09c40e855b56c2";
    private static final String REASON = "2026-10-19 사용자 승인: 보고서 통계 메뉴 퇴역";

    private static final String MENUS = "SELECT menu_sn::text || '/' || coalesce(up_menu_sn::text, '-') || '/'"
            + " || coalesce(modern_route, '-') || '/' || use_yn || '/' || del_yn FROM tb_menu_info ORDER BY menu_sn";
    private static final String GRANTS = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd"
            + " FROM tb_authrt_grnt_map ORDER BY 1";
    private static final String BOOKMARKS = "SELECT menu_id::text || '/' || user_id FROM tb_bkmk_menu_mng_rslt ORDER BY 1";
    private static final String HISTORY = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd || '/'"
            + " || chg_trgt_type_cd || '/' || chg_type_cd || '/' || chg_artcl_nm || '/' || chg_bfr_cn || '/'"
            + " || coalesce(chg_aftr_cn, '-') || '/' || plcy_ver_no || '/' || frst_rgtr_id || '/' || chg_rsn"
            + " FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.134' ORDER BY authrt_cd";
    private static final String REPORT_GROUPS = "SELECT authrt_cd FROM tb_authrt_grnt_map"
            + " WHERE authrt_type_cd = 'NAVIGATION' AND authrt_grnt_cd = '" + REPORT_MENU + "' ORDER BY authrt_cd";

    /** 이 메뉴와 형제 메뉴의 즐겨찾기. 사용 중인 메뉴라 실제로 생길 수 있다. */
    private static final String INSERT_BOOKMARKS = "INSERT INTO tb_bkmk_menu_mng_rslt (menu_id, user_id, menu_nm, crt_dt)"
            + " VALUES (" + REPORT_MENU + ", 'USRCNFRM_V2134_BKMK', '보고서통계', CURRENT_TIMESTAMP),"
            + " (" + SIBLING_MENU + ", 'USRCNFRM_V2134_BKMK', '화면통계', CURRENT_TIMESTAMP)";
    /** 같은 메뉴를 가진 둘째 그룹. 지울 때는 모든 그룹의 배정을 지우고 그룹마다 이력을 남긴다. */
    private static final String INSERT_SYSTEM_GRANT =
            "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                    + " VALUES ('ROLE_SYSTEM', 'NAVIGATION', '" + REPORT_MENU + "', 'SYSTEM', CURRENT_TIMESTAMP)";

    @Test
    @DisplayName("그 행만 배정·즐겨찾기와 함께 지우고, 바꿔 쓰거나 하위가 있거나 같은 경로의 다른 행이 있으면 실패하며, 이미 없으면 그대로 둔다")
    void retiresOnlyTheKnownReportStatsMenu() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.133")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> menusBefore;
        List<String> grantsBefore;
        List<String> reportGroups;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태(OCI 와 같은 모양). 이 행이 없으면 아래 단언이 아무것도 증명하지 못한다.
            assertThat(texts(statement, "SELECT menu_sn::text || '/' || up_menu_sn::text || '/' || modern_route || '/'"
                    + " || use_yn FROM tb_menu_info WHERE menu_sn = " + REPORT_MENU))
                    .as("V2_100 이 통계 섹션 아래로 옮긴 보고서 통계 메뉴")
                    // 경로가 '/' 로 시작하므로 구분자 뒤에 빗금이 둘 붙는다.
                    .containsExactly(REPORT_MENU + "/" + STATS_SECTION + "/" + REPORT_ROUTE + "/Y");
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE up_menu_sn = " + REPORT_MENU))
                    .as("하위 메뉴가 없다").isEmpty();
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE modern_route = '" + REPORT_ROUTE + "'"))
                    .as("그 경로를 가리키는 행은 이 하나다").containsExactly(REPORT_MENU);
            assertThat(texts(statement, "SELECT use_yn FROM tb_menu_info WHERE menu_sn = " + SIBLING_MENU))
                    .as("대조군 형제 메뉴는 사용 중이다").containsExactly("Y");
            reportGroups = texts(statement, REPORT_GROUPS);
            assertThat(reportGroups).as("시드 체인이 준 메뉴 배정").containsExactly("ROLE_ADMIN");
            assertThat(texts(statement, BOOKMARKS)).as("시드 체인에는 즐겨찾기가 없다").isEmpty();
            menusBefore = texts(statement, MENUS);
            grantsBefore = texts(statement, GRANTS);
        }

        assertRejectedWithinRollback(sql, "menu 9040105 does not point at /admin/stats/report",
                "UPDATE tb_menu_info SET modern_route = '/admin/stats/screen' WHERE menu_sn = " + REPORT_MENU);
        assertRejectedWithinRollback(sql, "menu 9040105 has child menus",
                "INSERT INTO tb_menu_info (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn)"
                        + " VALUES ('V2_134 하위', " + REPORT_MENU + ", 1, '/admin/help', 'Y')");
        assertRejectedWithinRollback(sql, "another menu row points at the retired route",
                "INSERT INTO tb_menu_info (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn)"
                        + " VALUES ('V2_134 같은 경로', " + STATS_SECTION + ", 9, '" + REPORT_ROUTE + "', 'Y')");
        assertUnchangedWithinRollback(sql, "행이 이미 없으면 남은 배정도 판정하지 않는다",
                "DELETE FROM tb_menu_info WHERE menu_sn = " + REPORT_MENU);

        // 꺼 둔 행도 사라지는 화면을 가리키므로 지운다 — 사용 여부는 판정하지 않는다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute("UPDATE tb_menu_info SET use_yn = 'N' WHERE menu_sn = " + REPORT_MENU);
                statement.execute(sql);
                assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE menu_sn = " + REPORT_MENU))
                        .as("꺼 둔 행도 지운다").isEmpty();
            } finally {
                connection.rollback();
            }
        }

        // 둘째 그룹의 배정과 즐겨찾기가 있어도 그 메뉴 몫만 지우고, 그룹마다 이력 한 줄을 남긴다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(INSERT_BOOKMARKS + "; " + INSERT_SYSTEM_GRANT);
                List<String> groups = texts(statement, REPORT_GROUPS);
                assertThat(groups).containsExactly("ROLE_ADMIN", "ROLE_SYSTEM");
                List<String> grants = texts(statement, GRANTS);

                statement.execute(sql);

                assertThat(texts(statement, REPORT_GROUPS)).as("그 메뉴의 배정이 남았다").isEmpty();
                assertThat(texts(statement, GRANTS)).as("다른 배정은 그대로다").isEqualTo(withoutReportMenu(grants));
                assertThat(texts(statement, BOOKMARKS)).as("형제 메뉴의 즐겨찾기만 남는다")
                        .containsExactly(SIBLING_MENU + "/USRCNFRM_V2134_BKMK");
                assertThat(texts(statement, HISTORY)).as("지운 배정마다 이력 한 줄").isEqualTo(expectedHistory(groups));
            } finally {
                connection.rollback();
            }
        }

        flyway(MigrationVersion.fromVersion("2.134")).migrate();

        List<String> menusAfter;
        List<String> grantsAfter;
        List<String> historyAfter;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            menusAfter = texts(statement, MENUS);
            List<String> expectedMenus = new ArrayList<>(menusBefore);
            expectedMenus.removeIf(row -> row.startsWith(REPORT_MENU + "/"));
            assertThat(expectedMenus).as("지울 행이 정확히 한 줄이다").hasSize(menusBefore.size() - 1);
            assertThat(menusAfter).as("그 메뉴 한 행만 빠지고 상위 섹션·형제는 그대로다").isEqualTo(expectedMenus);
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE up_menu_sn = " + STATS_SECTION))
                    .as("상위 섹션에는 다른 하위가 남는다").contains(SIBLING_MENU).doesNotContain(REPORT_MENU);
            assertThat(texts(statement, "SELECT count(*)::text FROM tb_rptp_stats"))
                    .as("물리 테이블은 남는다(이 변경은 메뉴만 걷는다)").hasSize(1);
            grantsAfter = texts(statement, GRANTS);
            assertThat(grantsAfter).as("그 메뉴의 배정만 빠진다").isEqualTo(withoutReportMenu(grantsBefore));
            historyAfter = texts(statement, HISTORY);
            assertThat(historyAfter).as("지운 배정마다 REMOVE 이력 한 줄(원장 버전·사유 포함)")
                    .isEqualTo(expectedHistory(reportGroups));
        }

        // 이미 지운 환경에서 같은 SQL 을 다시 실행해도 아무것도 바꾸지 않고 이력도 늘지 않는다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(sql);
                assertThat(texts(statement, MENUS)).as("다시 실행해도 메뉴가 그대로다").isEqualTo(menusAfter);
                assertThat(texts(statement, GRANTS)).as("다시 실행해도 배정이 그대로다").isEqualTo(grantsAfter);
                assertThat(texts(statement, HISTORY)).as("다시 실행해도 이력이 늘지 않는다").isEqualTo(historyAfter);
            } finally {
                connection.rollback();
            }
        }
    }

    /** setup 뒤 같은 SQL 이 그 사유로 실패하는지 본다. 실패한 문장은 아무것도 남기지 않는다(트랜잭션 전체를 되돌린다). */
    private void assertRejectedWithinRollback(String sql, String reason, String setup) throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup + "; " + INSERT_BOOKMARKS);
                assertThatThrownBy(() -> statement.execute(sql))
                        .as("예상과 다른 행은 건너뛰지 않고 멈춘다(%s)", reason)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("V2_134: " + reason);
            } finally {
                connection.rollback();
            }
        }
        // 실패한 적용은 메뉴·배정을 하나도 바꾸지 않는다 — 실패 뒤 다른 연결에서 본 상태가 시드 상태 그대로다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, REPORT_GROUPS)).as("배정이 그대로다(%s)", reason).containsExactly("ROLE_ADMIN");
            assertThat(texts(statement, HISTORY)).as("이력이 없다(%s)", reason).isEmpty();
        }
    }

    /** setup 뒤 같은 SQL 을 실행해도 메뉴·배정·즐겨찾기·이력이 하나도 바뀌지 않는지 본다. */
    private void assertUnchangedWithinRollback(String sql, String label, String setup) throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup + "; " + INSERT_BOOKMARKS);
                List<String> menus = texts(statement, MENUS);
                List<String> grants = texts(statement, GRANTS);
                List<String> bookmarks = texts(statement, BOOKMARKS);

                statement.execute(sql);

                assertThat(texts(statement, MENUS)).as("메뉴가 그대로다(%s)", label).isEqualTo(menus);
                assertThat(texts(statement, GRANTS)).as("배정이 그대로다(%s)", label).isEqualTo(grants);
                assertThat(texts(statement, BOOKMARKS)).as("즐겨찾기가 그대로다(%s)", label).isEqualTo(bookmarks);
                assertThat(texts(statement, HISTORY)).as("이력이 없다(%s)", label).isEmpty();
            } finally {
                connection.rollback();
            }
        }
    }

    private static List<String> withoutReportMenu(List<String> grants) {
        return grants.stream().filter(row -> !row.endsWith("/NAVIGATION/" + REPORT_MENU)).toList();
    }

    private static List<String> expectedHistory(List<String> groups) {
        return groups.stream().sorted()
                .map(group -> group + "/NAVIGATION/" + REPORT_MENU + "/GROUP_GRANT/REMOVE/grant/" + REPORT_MENU
                        + "/-/" + POLICY_VERSION + "/SYSTEM/" + REASON)
                .toList();
    }

    private static List<String> texts(Statement statement, String query) throws SQLException {
        List<String> values = new ArrayList<>();
        try (ResultSet result = statement.executeQuery(query)) {
            while (result.next()) {
                values.add(result.getString(1));
            }
        }
        return values;
    }
}
