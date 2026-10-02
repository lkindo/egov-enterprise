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
 * V2_119 가 '프로그램 관리' 메뉴를 '화면 관리' 로 바꾸고 시드 유래 이전 프로그램만 지우는지 본다.
 *
 * <p>[왜 필요한가] 개명 조건이 넓으면 관리자가 이미 바꾼 메뉴 이름을 덮고, 삭제 조건이 넓으면 도입 기관이 등록했거나
 * 메뉴가 연결한 프로그램을 지운다. 메뉴가 참조하는 프로그램을 지우려 하면 FK 가 migration 전체를 실패시킨다.
 * 같은 이름이라도 메뉴 자동 등록 코드의 표지가 없는 EgovBBSMaster 는 기관 등록분으로 보고 남겨야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_119 화면 관리 메뉴 개명과 이전 프로그램 정리")
class ScreenMenuRenameProgramRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE =
            "db/migration/V2_119__rename_screen_menu_and_retire_legacy_programs.sql";

    /** V2_11 이 넣고 V2_23·V2_40·V2_41·V2_84 의 정리 뒤 남은 시드 URL 인가 서술자. */
    private static final List<String> SEEDED_PROGRAMS = List.of(
            "ACTUATOR_ALL", "ADMIN_ALL", "ADMIN_DEPT_ALL", "ADMIN_DEPT_AUTH_ALL",
            "ADMIN_HELP_ALIAS", "ADMIN_HELP_ALL", "ADMIN_SURVEY_ALL",
            "ADMIN_USER_BULK_DEL", "ADMIN_USER_CREATE", "ADMIN_USER_DELETE", "ADMIN_USER_DEPT",
            "ADMIN_USER_DETAIL", "ADMIN_USER_LIST", "ADMIN_USER_PWD", "ADMIN_USER_ROLE",
            "ADMIN_USER_STATUS", "ADMIN_USER_UPDATE");

    /**
     * 개명 전 수정 표지. V2_100 이 이 메뉴의 수정자를 이미 'SYSTEM' 으로 두므로 다른 값으로 바꿔 두지 않으면
     * V2_119 가 수정자·수정일시를 남기는지 증명하지 못한다.
     */
    private static final String STALE_MODIFIER = "seed";
    private static final String STALE_MODIFIED_AT = "TIMESTAMP '2001-01-01 00:00:00'";

    @Test
    @DisplayName("시드 이름의 화면 목록 메뉴만 바꾸고, 목록 안의 미참조 프로그램만 지우며, 다시 실행해도 같다")
    void renamesSeedMenuAndRetiresOnlyUnreferencedLegacyPrograms() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.118")));

        long renamedByAdmin;
        long sameNameOtherRoute;
        long linkedMenu;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태. 목록이 비어 있으면 아래 단언이 아무것도 증명하지 못한다.
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE modern_route = '/admin/system/programs'"))
                    .as("시드 메뉴 9010230 하나").containsExactly("프로그램 관리");
            assertThat(programs(statement)).as("시드 프로그램").containsExactlyInAnyOrderElementsOf(SEEDED_PROGRAMS);
            assertThat(statement.executeUpdate("UPDATE tb_menu_info SET last_mdfr_id = '" + STALE_MODIFIER + "',"
                    + " mdfcn_dt = " + STALE_MODIFIED_AT + " WHERE menu_sn = 9010230")).isEqualTo(1);

            renamedByAdmin = insertMenu(statement, "기관 화면 목록", "'/admin/system/programs'", "NULL");
            sameNameOtherRoute = insertMenu(statement, "프로그램 관리", "'/admin/legacy/programs'", "NULL");
            linkedMenu = insertMenu(statement, "도움말 연결 메뉴", "'/admin/help'", "'ADMIN_HELP_ALL'");
            statement.executeUpdate("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url, prgrm_strg_path)"
                    + " VALUES ('EgovBBSMaster', '자동생성메뉴(시험 게시판)', '/admin/community/boards', '/auto-generated'),"
                    + " ('ORG_NOTICE_PROGRAM', '기관 공지 프로그램', '/api/v1/org/notices', '/org'),"
                    + " ('AUTO_ORG_BOARD', '자동생성메뉴(기관 게시판)', '/admin/community/boards', '/auto-generated')");
        }

        flyway(MigrationVersion.fromVersion("2.119")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, "SELECT menu_nm || '/' || last_mdfr_id FROM tb_menu_info WHERE menu_sn = 9010230"))
                    .as("시드 이름의 화면 목록 메뉴를 바꾸고 수정자를 남긴다").containsExactly("화면 관리/SYSTEM");
            assertThat(texts(statement, "SELECT (mdfcn_dt > " + STALE_MODIFIED_AT + ")::text"
                    + " FROM tb_menu_info WHERE menu_sn = 9010230"))
                    .as("개명한 메뉴의 수정일시를 새로 남긴다").containsExactly("true");
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE menu_sn = " + renamedByAdmin))
                    .as("관리자가 바꾼 이름은 그대로다").containsExactly("기관 화면 목록");
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE menu_sn = " + sameNameOtherRoute))
                    .as("다른 경로의 같은 이름은 그대로다").containsExactly("프로그램 관리");
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE menu_sn = " + linkedMenu))
                    .containsExactly("도움말 연결 메뉴");
            assertThat(programs(statement))
                    .as("메뉴가 참조한 시드 프로그램과 목록 밖 프로그램만 남는다")
                    .containsExactlyInAnyOrder("ADMIN_HELP_ALL", "AUTO_ORG_BOARD", "ORG_NOTICE_PROGRAM");
        }

        // 같은 SQL 을 다시 실행해도 아무 행도 바뀌지 않는다. EgovBBSMaster 는 두 표지(경로·이름)가 모두 있을 때만
        // 지우므로, 표지가 없거나 하나만 있는 행(기관 등록분)은 남는다. prgrm_file_nm 이 PK 라 경우마다 넣고 되돌린다.
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);
        assertRerunKeepsEgovBbsMaster(sql, "게시판 관리", "/egov/bbs", "표지 없음");
        assertRerunKeepsEgovBbsMaster(sql, "기관 게시판 관리", "/auto-generated", "경로 표지만");
        assertRerunKeepsEgovBbsMaster(sql, "자동생성메뉴(기관 게시판)", "/egov/bbs", "이름 표지만");
    }

    private void assertRerunKeepsEgovBbsMaster(String sql, String koreanName, String storagePath, String label)
            throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.executeUpdate("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url, prgrm_strg_path)"
                        + " VALUES ('EgovBBSMaster', '" + koreanName + "', '/admin/community/boards', '" + storagePath + "')");
                List<String> menusBefore = menuState(statement);
                List<String> programsBefore = programs(statement);

                statement.execute(sql);

                assertThat(menuState(statement)).as("다시 실행해도 메뉴가 그대로다(%s)", label).isEqualTo(menusBefore);
                assertThat(programs(statement)).as("다시 실행해도 프로그램이 그대로다(%s)", label)
                        .isEqualTo(programsBefore)
                        .contains("EgovBBSMaster");
            } finally {
                connection.rollback();
            }
        }
    }

    private static long insertMenu(Statement statement, String name, String route, String program) throws SQLException {
        try (ResultSet result = statement.executeQuery("INSERT INTO tb_menu_info (menu_nm, menu_ordr, modern_route, prgrm_file_nm)"
                + " VALUES ('" + name + "', 990, " + route + ", " + program + ") RETURNING menu_sn")) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private static List<String> programs(Statement statement) throws SQLException {
        return texts(statement, "SELECT prgrm_file_nm FROM tb_prgrm_lst ORDER BY prgrm_file_nm");
    }

    private static List<String> menuState(Statement statement) throws SQLException {
        return texts(statement, "SELECT menu_sn || ':' || menu_nm || ':' || coalesce(last_mdfr_id, '') || ':'"
                + " || coalesce(mdfcn_dt::text, '') FROM tb_menu_info ORDER BY menu_sn");
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
