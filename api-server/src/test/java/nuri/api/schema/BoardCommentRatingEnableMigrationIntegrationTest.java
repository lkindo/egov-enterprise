package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_109 가 기존 게시판의 댓글·만족도 설정을 지금까지의 실제 동작(받음)대로 켜는지 본다.
 *
 * <p>[왜 필요한가] 이 버전부터 ans_yn·stsfdg_yn 이 집행된다(DIP B5 F9). 기존 게시판은 대부분 기본값 N 인데
 * 그 값은 읽히지 않아 모든 게시판이 댓글·만족도를 받았다. 값을 맞추지 않고 집행을 켜면 댓글이 쌓인 게시판이
 * 그 순간 새 댓글을 막는다. 옵션 테이블도 같은 값을 들고 있으므로 함께 맞춰야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_109 기존 게시판 댓글·만족도 켜기")
class BoardCommentRatingEnableMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String OFF_BOARD = "BBSMSTR_V2109OFF001";
    private static final String NULL_BOARD = "BBSMSTR_V2109NUL001";

    @Test
    @DisplayName("N·NULL 인 게시판과 옵션 행을 Y 로 맞추고 다른 설정은 건드리지 않는다")
    void enablesCommentAndRatingOnExistingBoards() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.108")));

        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_bbs_master"
                    + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn, ans_yn, stsfdg_yn)"
                    + " VALUES ('" + OFF_BOARD + "', '끈 게시판', 'BBST01', 'BBSA02', 3, 'N', 'Y', 'N', 'N'),"
                    + " ('" + NULL_BOARD + "', '빈 게시판', 'BBST01', 'BBSA02', 0, 'Y', 'Y', NULL, NULL)");
            s.executeUpdate("INSERT INTO tb_bbs_master_optn (bbs_id, ans_yn, stsfdg_yn) VALUES ('" + OFF_BOARD + "', 'N', 'N')");
        }

        flyway(MigrationVersion.fromVersion("2.109")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(text(s, "SELECT ans_yn || stsfdg_yn FROM tb_bbs_master WHERE bbs_id = '" + OFF_BOARD + "'")).isEqualTo("YY");
            assertThat(text(s, "SELECT ans_yn || stsfdg_yn FROM tb_bbs_master WHERE bbs_id = '" + NULL_BOARD + "'")).isEqualTo("YY");
            assertThat(text(s, "SELECT ans_yn || stsfdg_yn FROM tb_bbs_master_optn WHERE bbs_id = '" + OFF_BOARD + "'")).isEqualTo("YY");
            assertThat(text(s, "SELECT file_atch_psblty_yn || atch_psblty_file_qty FROM tb_bbs_master WHERE bbs_id = '" + OFF_BOARD + "'"))
                    .as("첨부 설정은 이 마이그레이션의 대상이 아니다").isEqualTo("N3");
        }
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
