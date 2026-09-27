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
 * V2_111 이 폐기된 게시글 비밀번호 값만 비우고 게시글 행과 다른 컬럼은 그대로 두는지 본다.
 *
 * <p>[왜 필요한가] 작성 화면이 모든 글에 평문 '1' 을 채워 보냈고 DEC-OPS-174 에서 새 저장을 멈췄다. 남은 값은
 * 확인 경로가 없는 비밀번호라 읽는 코드가 없다(GAP-BOARD-001). 값을 비우는 것이 목적이므로 행이 사라지거나
 * 제목·본문·사용 여부가 바뀌면 안 된다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_111 폐기된 게시글 비밀번호 비우기")
class RetiredPostPasswordClearMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_ID = "BBSMSTR_V2111TEST01";

    @Test
    @DisplayName("비밀번호 값만 NULL 로 비우고 게시글 행과 다른 컬럼은 건드리지 않는다")
    void clearsRetiredPasswordOnly() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.110")));

        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_bbs_master"
                    + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                    + " VALUES ('" + BOARD_ID + "', '비밀번호 비우기 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
            s.executeUpdate("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, pst_cn, use_yn, sort_ordr, crt_dt, pswd)"
                    + " VALUES ('" + BOARD_ID + "', '값이 있는 글', '본문 하나', 'Y', 1, CURRENT_TIMESTAMP, '1'),"
                    + " ('" + BOARD_ID + "', '값이 없는 글', '본문 둘', 'N', 2, CURRENT_TIMESTAMP, NULL)");
        }

        flyway(MigrationVersion.fromVersion("2.111")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(number(s, "SELECT count(*) FROM tb_bbs_item WHERE bbs_id = '" + BOARD_ID + "'"))
                    .as("게시글 행은 지우지 않는다").isEqualTo(2);
            assertThat(number(s, "SELECT count(pswd) FROM tb_bbs_item WHERE bbs_id = '" + BOARD_ID + "'"))
                    .as("폐기된 비밀번호 값은 남지 않는다").isZero();
            assertThat(text(s, "SELECT pst_ttl || '|' || pst_cn || '|' || use_yn FROM tb_bbs_item"
                    + " WHERE bbs_id = '" + BOARD_ID + "' AND sort_ordr = 1"))
                    .as("비밀번호 외의 컬럼은 이 마이그레이션의 대상이 아니다").isEqualTo("값이 있는 글|본문 하나|Y");
            assertThat(text(s, "SELECT pst_ttl || '|' || pst_cn || '|' || use_yn FROM tb_bbs_item"
                    + " WHERE bbs_id = '" + BOARD_ID + "' AND sort_ordr = 2"))
                    .isEqualTo("값이 없는 글|본문 둘|N");
        }
    }

    private static long number(Statement statement, String query) throws SQLException {
        return Long.parseLong(text(statement, query));
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
