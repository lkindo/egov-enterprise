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
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_120 이 ROLE_USER 의 들어갈 수 없는 설문·투표 관리 메뉴 배정만 지우고 지운 만큼 변경 이력을 남기는지 본다.
 *
 * <p>[왜 필요한가] 그 메뉴들이 여는 /admin/survey/hub 는 SURVEY_READ_ALL·SURVEY_RSP_READ 중 하나가 있어야 들어간다.
 * ROLE_USER 에는 둘 다 없어 메뉴만 보이고 누르면 막힌다. 반대로 조건이 넓으면 정당한 배정을 지운다 — 진입 권한을
 * 받은 그룹, 관리자가 다른 화면으로 바꾼 메뉴, 그 메뉴가 보이도록 남아야 하는 상위, 다른 메뉴가 남은 관리 센터,
 * 참여 분류의 설문·투표 참여 메뉴, 검토 범위 밖의 같은 화면 메뉴, 같은 메뉴를 가진 다른 그룹, 그리고 다른 그룹으로
 * 진입 권한을 받아 ROLE_USER 배정으로 메뉴를 보던 구성원이 그렇다(메뉴 노출은 구성원 그룹 전체의 합집합이다).
 * 경우마다 같은 SQL 을 롤백 트랜잭션에서 실행해 지워진 배정과 이력을 대조한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_120 ROLE_USER 의 들어갈 수 없는 설문·투표 관리 메뉴 배정 회수")
class UserSurveyAdminNavigationRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE =
            "db/migration/V2_120__revoke_unenterable_survey_admin_menus_from_user.sql";

    /** /admin/survey/hub 를 여는 설문·투표 관리 메뉴(상위 2010000 과 그 하위). */
    private static final List<String> SURVEY_ADMIN_MENUS =
            List.of("2010000", "2010300", "2010400", "2010500", "2010600");
    private static final List<String> SURVEY_ADMIN_CHILDREN = List.of("2010300", "2010400", "2010500", "2010600");
    private static final String MANAGEMENT_CENTER = "9000000";
    /** '참여' 분류 아래의 설문 참여·투표 참여. ROLE_USER 가 실제로 쓰는 메뉴다. */
    private static final List<String> PARTICIPATION_MENUS = List.of("2010800", "2010900");
    /** 관리 센터 아래 둘째 깊이 메뉴(권한·보안 9020100 아래 권한 그룹 관리). */
    private static final String DEEP_MANAGEMENT_MENU = "9020311";
    /** 같은 설문 관리 화면(?tab=stats)을 여는 2010000 아래 메뉴. 검토한 다섯 행 밖이라 V2_120 의 대상이 아니다. */
    private static final String SURVEY_STATS_MENU = "2010210";

    /**
     * 적용 시점 권한 원장 버전의 스냅샷. {@code PermissionCodes.CATALOG_VERSION} 과 비교하지 않는다 — 그 상수는 원장이
     * 바뀌면 따라 바뀌지만, 이미 적용된 마이그레이션의 이력 값은 바뀌지 않는다(V2_104 도 리터럴이다).
     */
    private static final String POLICY_VERSION = "cb031191bae483aa9abf2f8c10de9e5b2f47821fc1a57e51184e5b7ed54a2c87";
    private static final String SURVEY_REASON = "진입 권한(SURVEY_READ_ALL·SURVEY_RSP_READ) 없는 설문·투표 관리 메뉴 배정 회수";
    private static final String CATEGORY_REASON = "하위 메뉴 배정이 남지 않은 관리 센터 분류 배정 회수";

    /** ROLE_USER 에만 속한 구성원. OCI 의 일반 사용자와 같은 모양이다. */
    private static final String MEMBER = "USRCNFRM_V2120_MEMBR";
    private static final String INSERT_USER_MEMBER =
            "INSERT INTO tb_user_info (esntl_id, user_id, user_nm, user_type_cd, pswd, user_stts_cd, sbscrb_ymd)"
                    + " VALUES ('" + MEMBER + "', 'v2120member', 'V2_120 구성원', 'EMP', '{disabled}NO-LOGIN', 'P', '20261003');"
                    + " INSERT INTO tb_authrt_user_map (scrty_dcsn_trgt_id, authrt_cd, mbr_type_cd, frst_rgtr_id, crt_dt)"
                    + " VALUES ('" + MEMBER + "', 'ROLE_USER', 'USR', 'SYSTEM', CURRENT_TIMESTAMP)";
    /** 같은 구성원이 ROLE_SYSTEM(진입 권한 있음·메뉴 배정 없음)에도 속한다. */
    private static final String INSERT_MULTI_GROUP_MEMBER = INSERT_USER_MEMBER
            + "; INSERT INTO tb_authrt_user_map (scrty_dcsn_trgt_id, authrt_cd, mbr_type_cd, frst_rgtr_id, crt_dt)"
            + " VALUES ('" + MEMBER + "', 'ROLE_SYSTEM', 'USR', 'SYSTEM', CURRENT_TIMESTAMP)";

    private static final String USER_NAVIGATION = "SELECT authrt_grnt_cd FROM tb_authrt_grnt_map"
            + " WHERE authrt_cd = 'ROLE_USER' AND authrt_type_cd = 'NAVIGATION' ORDER BY authrt_grnt_cd";
    private static final String OTHER_GRANTS = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd"
            + " FROM tb_authrt_grnt_map WHERE NOT (authrt_cd = 'ROLE_USER' AND authrt_type_cd = 'NAVIGATION')"
            + " ORDER BY 1";
    private static final String HISTORY = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd || '/'"
            + " || chg_trgt_type_cd || '/' || chg_type_cd || '/' || chg_artcl_nm || '/' || chg_bfr_cn || '/'"
            + " || coalesce(chg_aftr_cn, '-') || '/' || plcy_ver_no || '/' || frst_rgtr_id || '/' || chg_rsn"
            + " FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.120' ORDER BY authrt_grnt_cd";

    @Test
    @DisplayName("진입 권한 없는 ROLE_USER 의 설문·투표 관리 메뉴와 비게 된 관리 센터만 지우고 지운 행마다 이력을 남긴다")
    void retiresOnlyUnenterableSurveyAdminNavigation() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.119")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> userBefore;
        List<String> othersBefore;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태. 이 배정이 없으면 아래 단언이 아무것도 증명하지 못한다.
            userBefore = texts(statement, USER_NAVIGATION);
            assertThat(userBefore).as("ROLE_USER 의 설문·투표 관리·관리 센터·참여 메뉴 배정")
                    .containsAll(SURVEY_ADMIN_MENUS).contains(MANAGEMENT_CENTER).containsAll(PARTICIPATION_MENUS)
                    .doesNotContain(SURVEY_STATS_MENU);
            assertThat(texts(statement, "SELECT authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_cd = 'ROLE_USER'"
                    + " AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN ('SURVEY_READ_ALL', 'SURVEY_RSP_READ')"))
                    .as("ROLE_USER 에는 설문 관리 화면의 진입 권한이 없다").isEmpty();
            assertThat(texts(statement, "SELECT DISTINCT split_part(modern_route, '?', 1) FROM tb_menu_info"
                    + " WHERE menu_sn::text IN ('2010000', '2010300', '2010400', '2010500', '2010600', '"
                    + SURVEY_STATS_MENU + "')"))
                    .as("다섯 메뉴와 통계 메뉴 모두 설문 관리 화면을 연다").containsExactly("/admin/survey/hub");
            assertThat(texts(statement, "SELECT up_menu_sn::text FROM tb_menu_info WHERE menu_sn = " + SURVEY_STATS_MENU))
                    .as("통계 메뉴는 설문·투표 관리의 하위다").containsExactly("2010000");
            assertThat(underManagementCenter(statement)).as("관리 센터 아래 ROLE_USER 배정은 설문·투표 관리뿐이다")
                    .containsExactlyInAnyOrderElementsOf(SURVEY_ADMIN_MENUS);
            assertThat(texts(statement, "SELECT up.up_menu_sn::text FROM tb_menu_info menu"
                    + " JOIN tb_menu_info up ON up.menu_sn = menu.up_menu_sn WHERE menu.menu_sn = " + DEEP_MANAGEMENT_MENU))
                    .as("깊이 대조군은 관리 센터의 손자다").containsExactly(MANAGEMENT_CENTER);
            assertThat(texts(statement, "SELECT authrt_type_cd || '/' || authrt_grnt_cd FROM tb_authrt_grnt_map"
                    + " WHERE authrt_cd = 'ROLE_SYSTEM' AND (authrt_type_cd = 'NAVIGATION'"
                    + " OR authrt_grnt_cd IN ('SURVEY_READ_ALL', 'SURVEY_RSP_READ')) ORDER BY 1"))
                    .as("복수 그룹 대조군: ROLE_SYSTEM 은 진입 권한만 있고 메뉴 배정은 없다")
                    .containsExactly("OPERATION/SURVEY_READ_ALL", "OPERATION/SURVEY_RSP_READ");
            assertThat(texts(statement, "SELECT DISTINCT user_member.scrty_dcsn_trgt_id FROM tb_authrt_user_map user_member"
                    + " JOIN tb_authrt_user_map membership ON membership.scrty_dcsn_trgt_id = user_member.scrty_dcsn_trgt_id"
                    + " JOIN tb_authrt_grnt_map entry ON entry.authrt_cd = membership.authrt_cd"
                    + " WHERE user_member.authrt_cd = 'ROLE_USER' AND entry.authrt_type_cd = 'OPERATION'"
                    + " AND entry.authrt_grnt_cd IN ('SURVEY_READ_ALL', 'SURVEY_RSP_READ')"))
                    .as("시드 체인에는 진입 권한을 가진 ROLE_USER 구성원이 없다").isEmpty();
            othersBefore = texts(statement, OTHER_GRANTS);
            assertThat(othersBefore).as("대조군: 같은 메뉴를 가진 다른 그룹")
                    .contains("ROLE_ADMIN/NAVIGATION/2010000", "ROLE_ADMIN/NAVIGATION/" + MANAGEMENT_CENTER);
        }

        List<String> allRetired = new ArrayList<>(SURVEY_ADMIN_MENUS);
        allRetired.add(MANAGEMENT_CENTER);

        for (String entry : List.of("SURVEY_READ_ALL", "SURVEY_RSP_READ")) {
            assertRetiredWithinRollback(sql, "진입 권한 " + entry + " 이 있으면 정당한 배정이다",
                    "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                            + " VALUES ('ROLE_USER', 'OPERATION', '" + entry + "', 'SYSTEM', CURRENT_TIMESTAMP)",
                    List.of());
        }
        assertRetiredWithinRollback(sql,
                "다른 화면으로 바꾼 하위 메뉴는 남고, 그 메뉴가 보이도록 상위와 관리 센터도 남는다",
                "UPDATE tb_menu_info SET modern_route = '/survey' WHERE menu_sn = 2010300",
                List.of("2010400", "2010500", "2010600"));
        assertRetiredWithinRollback(sql, "관리 센터 아래 둘째 깊이에 다른 배정이 남으면 관리 센터는 남는다",
                "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                        + " VALUES ('ROLE_USER', 'NAVIGATION', '" + DEEP_MANAGEMENT_MENU + "', 'SYSTEM', CURRENT_TIMESTAMP)",
                SURVEY_ADMIN_MENUS);
        assertRetiredWithinRollback(sql, "이 변경이 비우지 않은 관리 센터 배정은 건드리지 않는다",
                "DELETE FROM tb_authrt_grnt_map WHERE authrt_cd = 'ROLE_USER' AND authrt_type_cd = 'NAVIGATION'"
                        + " AND authrt_grnt_cd IN ('2010000', '2010300', '2010400', '2010500', '2010600')",
                List.of());
        assertRetiredWithinRollback(sql, "화면 경로가 있는 관리 센터는 빈 분류가 아니다",
                "UPDATE tb_menu_info SET modern_route = '/admin/work-hub' WHERE menu_sn = " + MANAGEMENT_CENTER,
                SURVEY_ADMIN_MENUS);
        // 같은 화면을 열어도 검토한 다섯 행 밖의 배정(V2_36 이 회수한 뒤 관리자가 다시 준 통계 메뉴)은 대상이 아니다.
        assertRetiredWithinRollback(sql, "검토 범위 밖의 같은 화면 메뉴는 남고, 그 상위와 관리 센터도 남는다",
                "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                        + " VALUES ('ROLE_USER', 'NAVIGATION', '" + SURVEY_STATS_MENU + "', 'SYSTEM', CURRENT_TIMESTAMP)",
                SURVEY_ADMIN_CHILDREN);
        // 메뉴 노출은 구성원 그룹 전체의 합집합이다. 진입 권한이 없는 구성원은 판정을 바꾸지 않는다.
        assertRetiredWithinRollback(sql, "ROLE_USER 에만 속한 구성원은 들어갈 수 없으므로 판정이 같다",
                INSERT_USER_MEMBER, allRetired);
        assertRetiredWithinRollback(sql,
                "다른 그룹으로 진입 권한을 받고 그 그룹에 메뉴 배정이 없는 구성원이 있으면 모두 남는다",
                INSERT_MULTI_GROUP_MEMBER, List.of());
        assertRetiredWithinRollback(sql,
                "그 구성원의 다른 그룹이 설문 메뉴를 주면 그 메뉴만 지우고, 주지 않는 관리 센터는 남긴다",
                INSERT_MULTI_GROUP_MEMBER + "; " + systemNavigation(SURVEY_ADMIN_MENUS),
                SURVEY_ADMIN_MENUS);
        List<String> systemAll = new ArrayList<>(SURVEY_ADMIN_MENUS);
        systemAll.add(MANAGEMENT_CENTER);
        assertRetiredWithinRollback(sql, "그 구성원의 다른 그룹이 관리 센터까지 주면 모두 지운다",
                INSERT_MULTI_GROUP_MEMBER + "; " + systemNavigation(systemAll), allRetired);

        flyway(MigrationVersion.fromVersion("2.120")).migrate();

        List<String> userAfter;
        List<String> othersAfter;
        List<String> historyAfter;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            userAfter = texts(statement, USER_NAVIGATION);
            List<String> expected = new ArrayList<>(userBefore);
            expected.removeAll(allRetired);
            assertThat(userAfter).as("설문·투표 관리 다섯 메뉴와 관리 센터만 빠진다").isEqualTo(expected);
            assertThat(userAfter).as("참여 메뉴는 남는다").containsAll(PARTICIPATION_MENUS);
            othersAfter = texts(statement, OTHER_GRANTS);
            assertThat(othersAfter).as("다른 그룹과 기능 권한 배정은 그대로다").isEqualTo(othersBefore);
            historyAfter = texts(statement, HISTORY);
            assertThat(historyAfter).as("지운 행마다 REMOVE 이력 한 줄(원장 버전·사유 포함)")
                    .isEqualTo(expectedHistory(allRetired));
        }

        // 같은 SQL 을 다시 실행해도 아무 배정도 지우지 않고 이력도 늘지 않는다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(sql);
                assertThat(texts(statement, USER_NAVIGATION)).as("다시 실행해도 ROLE_USER 배정이 그대로다").isEqualTo(userAfter);
                assertThat(texts(statement, OTHER_GRANTS)).as("다시 실행해도 다른 배정이 그대로다").isEqualTo(othersAfter);
                assertThat(texts(statement, HISTORY)).as("다시 실행해도 이력이 늘지 않는다").isEqualTo(historyAfter);
            } finally {
                connection.rollback();
            }
        }
    }

    /** setup 뒤 같은 SQL 을 실행해 ROLE_USER 에서 지워진 배정이 기대와 같고, 그 행마다만 이력이 남는지 본다. */
    private void assertRetiredWithinRollback(String sql, String label, String setup, List<String> expectedRetired)
            throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup);
                List<String> before = texts(statement, USER_NAVIGATION);
                List<String> others = texts(statement, OTHER_GRANTS);

                statement.execute(sql);

                List<String> retired = new ArrayList<>(before);
                retired.removeAll(texts(statement, USER_NAVIGATION));
                assertThat(new TreeSet<>(retired)).as("지워진 ROLE_USER 배정(%s)", label)
                        .isEqualTo(new TreeSet<>(expectedRetired));
                assertThat(texts(statement, USER_NAVIGATION)).as("참여 메뉴는 남는다(%s)", label)
                        .containsAll(PARTICIPATION_MENUS);
                assertThat(texts(statement, OTHER_GRANTS)).as("다른 배정은 그대로다(%s)", label).isEqualTo(others);
                assertThat(texts(statement, HISTORY)).as("지운 행마다 이력 한 줄(%s)", label)
                        .isEqualTo(expectedHistory(expectedRetired));
            } finally {
                connection.rollback();
            }
        }
    }

    private static String systemNavigation(List<String> menus) {
        return "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                + " SELECT 'ROLE_SYSTEM', 'NAVIGATION', code, 'SYSTEM', CURRENT_TIMESTAMP"
                + " FROM unnest(ARRAY['" + String.join("', '", menus) + "']) AS menu(code)";
    }

    private static List<String> expectedHistory(List<String> retired) {
        return new TreeSet<>(retired).stream()
                .map(code -> "ROLE_USER/NAVIGATION/" + code + "/GROUP_GRANT/REMOVE/grant/" + code + "/-/"
                        + POLICY_VERSION + "/SYSTEM/" + (MANAGEMENT_CENTER.equals(code) ? CATEGORY_REASON : SURVEY_REASON))
                .toList();
    }

    private static List<String> underManagementCenter(Statement statement) throws SQLException {
        return texts(statement, "WITH RECURSIVE tree AS (SELECT menu_sn FROM tb_menu_info WHERE up_menu_sn = "
                + MANAGEMENT_CENTER + " UNION SELECT child.menu_sn FROM tb_menu_info child"
                + " JOIN tree parent ON child.up_menu_sn = parent.menu_sn)"
                + " SELECT grant_row.authrt_grnt_cd FROM tb_authrt_grnt_map grant_row"
                + " JOIN tree ON tree.menu_sn::text = grant_row.authrt_grnt_cd"
                + " WHERE grant_row.authrt_cd = 'ROLE_USER' AND grant_row.authrt_type_cd = 'NAVIGATION'");
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
