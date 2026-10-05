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

/**
 * V2_125 가 꺼진 '마이페이지관리' 메뉴(2030100) 행과 그 메뉴 배정·즐겨찾기를 지우고, 지운 배정마다 변경 이력을 남기는지 본다.
 *
 * <p>[왜 필요한가] 그 메뉴의 화면은 2026-09-08 결정(DEC-OPS-070)으로 걷혔고 V2_88 이 메뉴를 껐다. 메뉴 관리 화면과
 * 그룹의 메뉴 배정에는 존재하지 않는 화면을 가리키는 행이 남는다. 반대로 조건이 넓으면 도입 기관이 다시 켜거나 다른
 * 화면으로 바꿔 쓰는 행, 하위를 둔 행을 지운다. 그런 행은 배정·즐겨찾기까지 그대로 남아야 한다. 이미 지운 환경에서
 * 다시 실행해도 아무것도 바꾸지 않아야 한다. 경우마다 같은 SQL 을 롤백 트랜잭션에서 실행해 대조한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_125 꺼진 마이페이지 관리 메뉴 퇴역")
class MyPageMenuRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_125__retire_my_page_menu.sql";
    private static final String MY_PAGE_MENU = "2030100";
    private static final String SUPPORT_CATEGORY = "2030000";
    /** 같은 분류 아래의 사용 중 형제 메뉴. 대조군이다. */
    private static final String SIBLING_MENU = "2030200";

    /**
     * 적용 시점 권한 원장 버전의 스냅샷. {@code PermissionCodes.CATALOG_VERSION} 과 비교하지 않는다 — 그 상수는 원장이
     * 바뀌면 따라 바뀌지만, 이미 적용된 마이그레이션의 이력 값은 바뀌지 않는다(V2_120 도 리터럴이다).
     */
    private static final String POLICY_VERSION = "2b7eac07ccdf5c02a41091659f36fa8838266e4f9c6905c0484825cb37005991";
    private static final String REASON = "DEC-OPS-229: 마이페이지 관리 메뉴 퇴역";

    private static final String MENUS = "SELECT menu_sn::text || '/' || coalesce(up_menu_sn::text, '-') || '/'"
            + " || coalesce(modern_route, '-') || '/' || use_yn || '/' || del_yn FROM tb_menu_info ORDER BY menu_sn";
    private static final String GRANTS = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd"
            + " FROM tb_authrt_grnt_map ORDER BY 1";
    private static final String BOOKMARKS = "SELECT menu_id::text || '/' || user_id FROM tb_bkmk_menu_mng_rslt ORDER BY 1";
    private static final String HISTORY = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd || '/'"
            + " || chg_trgt_type_cd || '/' || chg_type_cd || '/' || chg_artcl_nm || '/' || chg_bfr_cn || '/'"
            + " || coalesce(chg_aftr_cn, '-') || '/' || plcy_ver_no || '/' || frst_rgtr_id || '/' || chg_rsn"
            + " FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.125' ORDER BY authrt_cd";
    private static final String MY_PAGE_GROUPS = "SELECT authrt_cd FROM tb_authrt_grnt_map"
            + " WHERE authrt_type_cd = 'NAVIGATION' AND authrt_grnt_cd = '" + MY_PAGE_MENU + "' ORDER BY authrt_cd";

    /** 이 메뉴와 형제 메뉴의 즐겨찾기. 사용하지 않는 메뉴의 즐겨찾기는 앱으로 만들 수 없어 직접 넣는다. */
    private static final String INSERT_BOOKMARKS = "INSERT INTO tb_bkmk_menu_mng_rslt (menu_id, user_id, menu_nm, crt_dt)"
            + " VALUES (" + MY_PAGE_MENU + ", 'USRCNFRM_V2125_BKMK', '마이페이지관리', CURRENT_TIMESTAMP),"
            + " (" + SIBLING_MENU + ", 'USRCNFRM_V2125_BKMK', '행사 외부인사 관리', CURRENT_TIMESTAMP)";
    /** 같은 메뉴를 가진 둘째 그룹. 지울 때는 모든 그룹의 배정을 지우고 그룹마다 이력을 남긴다. */
    private static final String INSERT_SYSTEM_GRANT =
            "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                    + " VALUES ('ROLE_SYSTEM', 'NAVIGATION', '" + MY_PAGE_MENU + "', 'SYSTEM', CURRENT_TIMESTAMP)";

    @Test
    @DisplayName("꺼진 그 행만 배정·즐겨찾기와 함께 지우고, 다시 켰거나 바꿔 쓰거나 하위가 있거나 이미 없으면 그대로 둔다")
    void retiresOnlyTheKnownDisabledMyPageMenu() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.124")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> menusBefore;
        List<String> grantsBefore;
        List<String> myPageGroups;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태(OCI 와 같은 모양). 이 행이 없으면 아래 단언이 아무것도 증명하지 못한다.
            assertThat(texts(statement, "SELECT menu_sn::text || '/' || up_menu_sn::text || '/' || modern_route || '/'"
                    + " || use_yn FROM tb_menu_info WHERE menu_sn = " + MY_PAGE_MENU))
                    .as("V2_88 이 끈 마이페이지 관리 메뉴")
                    // 경로가 '/' 로 시작하므로 구분자 뒤에 빗금이 둘 붙는다.
                    .containsExactly(MY_PAGE_MENU + "/" + SUPPORT_CATEGORY + "//admin/workspace/my-page/N");
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE up_menu_sn = " + MY_PAGE_MENU))
                    .as("하위 메뉴가 없다").isEmpty();
            assertThat(texts(statement, "SELECT use_yn FROM tb_menu_info WHERE menu_sn = " + SIBLING_MENU))
                    .as("대조군 형제 메뉴는 사용 중이다").containsExactly("Y");
            myPageGroups = texts(statement, MY_PAGE_GROUPS);
            assertThat(myPageGroups).as("남은 메뉴 배정 — V2_36 이 ROLE_USER 배정을 회수했다")
                    .contains("ROLE_ADMIN").doesNotContain("ROLE_USER");
            assertThat(texts(statement, BOOKMARKS)).as("시드 체인에는 즐겨찾기가 없다").isEmpty();
            menusBefore = texts(statement, MENUS);
            grantsBefore = texts(statement, GRANTS);
        }

        assertUnchangedWithinRollback(sql, "다시 켠 행은 도입 기관이 쓰는 메뉴다",
                "UPDATE tb_menu_info SET use_yn = 'Y' WHERE menu_sn = " + MY_PAGE_MENU);
        assertUnchangedWithinRollback(sql, "다른 화면으로 바꾼 행은 도입 기관이 쓰는 메뉴다",
                "UPDATE tb_menu_info SET modern_route = '/admin/work-hub' WHERE menu_sn = " + MY_PAGE_MENU);
        assertUnchangedWithinRollback(sql, "하위 메뉴를 둔 행은 우리가 아는 말단이 아니다",
                "INSERT INTO tb_menu_info (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn)"
                        + " VALUES ('V2_125 하위', " + MY_PAGE_MENU + ", 1, '/admin/help', 'Y')");
        assertUnchangedWithinRollback(sql, "행이 이미 없으면 남은 배정도 판정하지 않는다",
                "DELETE FROM tb_menu_info WHERE menu_sn = " + MY_PAGE_MENU);

        // 둘째 그룹의 배정과 즐겨찾기가 있어도 그 메뉴 몫만 지우고, 그룹마다 이력 한 줄을 남긴다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(INSERT_BOOKMARKS + "; " + INSERT_SYSTEM_GRANT);
                List<String> groups = texts(statement, MY_PAGE_GROUPS);
                assertThat(groups).contains("ROLE_ADMIN", "ROLE_SYSTEM");
                List<String> grants = texts(statement, GRANTS);

                statement.execute(sql);

                assertThat(texts(statement, MY_PAGE_GROUPS)).as("그 메뉴의 배정이 남았다").isEmpty();
                assertThat(texts(statement, GRANTS)).as("다른 배정은 그대로다").isEqualTo(withoutMyPage(grants));
                assertThat(texts(statement, BOOKMARKS)).as("형제 메뉴의 즐겨찾기만 남는다")
                        .containsExactly(SIBLING_MENU + "/USRCNFRM_V2125_BKMK");
                assertThat(texts(statement, HISTORY)).as("지운 배정마다 이력 한 줄").isEqualTo(expectedHistory(groups));
            } finally {
                connection.rollback();
            }
        }

        flyway(MigrationVersion.fromVersion("2.125")).migrate();

        List<String> menusAfter;
        List<String> grantsAfter;
        List<String> historyAfter;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            menusAfter = texts(statement, MENUS);
            List<String> expectedMenus = new ArrayList<>(menusBefore);
            expectedMenus.removeIf(row -> row.startsWith(MY_PAGE_MENU + "/"));
            assertThat(expectedMenus).as("지울 행이 정확히 한 줄이다").hasSize(menusBefore.size() - 1);
            assertThat(menusAfter).as("그 메뉴 한 행만 빠지고 상위 분류·형제는 그대로다").isEqualTo(expectedMenus);
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE up_menu_sn = " + SUPPORT_CATEGORY))
                    .as("상위 분류에는 다른 하위가 남는다").contains(SIBLING_MENU).doesNotContain(MY_PAGE_MENU);
            grantsAfter = texts(statement, GRANTS);
            assertThat(grantsAfter).as("그 메뉴의 배정만 빠진다").isEqualTo(withoutMyPage(grantsBefore));
            historyAfter = texts(statement, HISTORY);
            assertThat(historyAfter).as("지운 배정마다 REMOVE 이력 한 줄(원장 버전·사유 포함)")
                    .isEqualTo(expectedHistory(myPageGroups));
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

    private static List<String> withoutMyPage(List<String> grants) {
        return grants.stream().filter(row -> !row.endsWith("/NAVIGATION/" + MY_PAGE_MENU)).toList();
    }

    private static List<String> expectedHistory(List<String> groups) {
        return groups.stream().sorted()
                .map(group -> group + "/NAVIGATION/" + MY_PAGE_MENU + "/GROUP_GRANT/REMOVE/grant/" + MY_PAGE_MENU
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
