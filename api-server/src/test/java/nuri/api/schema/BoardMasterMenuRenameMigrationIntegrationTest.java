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
 * V2_138 이 게시판 마스터 화면의 메뉴 이름을 '게시판 관리' 로 바꾸는지 본다(2026-10-23 ADR-0040 A1).
 *
 * <p>[왜 필요한가] 개명 조건이 넓으면 관리자가 이미 바꾼 메뉴 이름이나, 같은 이름을 쓰는 다른 경로의 메뉴를 덮는다.
 * 경로와 이름이 모두 시드 값인 행만 바뀌고, 수정자·수정일시가 남으며, 다시 실행해도 같아야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_138 게시판 관리 메뉴 개명")
class BoardMasterMenuRenameMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_138__rename_board_master_menu.sql";
    private static final long SEED_MENU = 9030140L;
    private static final String STALE_MODIFIER = "seed";
    private static final String STALE_MODIFIED_AT = "TIMESTAMP '2001-01-01 00:00:00'";

    @Test
    @DisplayName("시드 이름의 게시판 마스터 메뉴만 바꾸고 수정 기록을 남기며, 다시 실행해도 같다")
    void renamesOnlyTheSeedBoardMasterMenu() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.137")));

        long renamedByAdmin;
        long sameNameOtherRoute;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태. 비어 있으면 아래 단언이 아무것도 증명하지 못한다.
            assertThat(texts(statement, "SELECT menu_sn || ':' || menu_nm FROM tb_menu_info"
                    + " WHERE modern_route = '/admin/community/boards/master'"))
                    .as("시드 메뉴 9030140 하나").containsExactly(SEED_MENU + ":통합 게시판 마스터 콘솔");
            assertThat(statement.executeUpdate("UPDATE tb_menu_info SET last_mdfr_id = '" + STALE_MODIFIER + "',"
                    + " mdfcn_dt = " + STALE_MODIFIED_AT + " WHERE menu_sn = " + SEED_MENU)).isEqualTo(1);
            renamedByAdmin = insertMenu(statement, "기관 게시판 운영", "/admin/community/boards/master");
            sameNameOtherRoute = insertMenu(statement, "통합 게시판 마스터 콘솔", "/admin/legacy/boards");
        }

        flyway(MigrationVersion.fromVersion("2.138")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, "SELECT menu_nm || '/' || last_mdfr_id || '/' || (mdfcn_dt > "
                    + STALE_MODIFIED_AT + ")::text FROM tb_menu_info WHERE menu_sn = " + SEED_MENU))
                    .as("시드 메뉴를 바꾸고 수정자·수정일시를 남긴다").containsExactly("게시판 관리/SYSTEM/true");
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE menu_sn = " + renamedByAdmin))
                    .as("관리자가 바꾼 이름은 그대로다").containsExactly("기관 게시판 운영");
            assertThat(texts(statement, "SELECT menu_nm FROM tb_menu_info WHERE menu_sn = " + sameNameOtherRoute))
                    .as("다른 경로의 같은 이름은 그대로다").containsExactly("통합 게시판 마스터 콘솔");

            // Flyway 처럼 트랜잭션 안에서 다시 실행한다(SET LOCAL 이 그 안에서만 뜻이 있다).
            connection.setAutoCommit(false);
            try {
                List<String> before = menuState(statement);
                statement.execute(new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8));
                assertThat(menuState(statement)).as("다시 실행해도 메뉴가 그대로다").isEqualTo(before);
            } finally {
                connection.rollback();
            }
        }
    }

    private static long insertMenu(Statement statement, String name, String route) throws SQLException {
        try (ResultSet result = statement.executeQuery("INSERT INTO tb_menu_info (menu_nm, menu_ordr, modern_route)"
                + " VALUES ('" + name + "', 990, '" + route + "') RETURNING menu_sn")) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
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
