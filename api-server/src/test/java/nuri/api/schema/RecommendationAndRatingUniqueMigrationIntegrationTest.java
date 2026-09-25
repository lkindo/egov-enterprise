package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_107 이 추천 이력 테이블과 만족도 1인 1건·점수 범위 제약을 거는지 본다.
 *
 * <p>[왜 필요한가] 추천은 카운터만 올려 같은 사람이 여러 번 누를 수 있었고, 만족도는 한 사람이 같은 글에
 * 평가를 여러 개 남겨 평균을 움직일 수 있었다(DIP I6 ④⑤). 제약은 이미 쌓인 중복을 어느 쪽을 남길지 정할 수
 * 없으므로, 중복이 있으면 이 마이그레이션은 멈춰야 하고 데이터를 지우거나 고치지 않아야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_107 추천 이력·만족도 1인 1건")
class RecommendationAndRatingUniqueMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_ID = "BBSMSTR_V2107TEST01";

    @Test
    @DisplayName("중복 만족도가 있으면 멈추고 행을 건드리지 않는다. 중복을 정리하면 제약이 걸린다")
    void stopsOnDuplicatesThenEnforcesOnePerPerson() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.106")));

        long pstSn;
        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_bbs_master"
                    + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                    + " VALUES ('" + BOARD_ID + "', '추천·만족도 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
            s.executeUpdate("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, sort_ordr, crt_dt)"
                    + " VALUES ('" + BOARD_ID + "', '검증 글', 'Y', 1, CURRENT_TIMESTAMP)");
            pstSn = count(s, "SELECT max(pst_sn) FROM tb_bbs_item WHERE bbs_id = '" + BOARD_ID + "'");
            insertRating(s, pstSn, 901, "rater", 5);
            insertRating(s, pstSn, 902, "rater", 1);
        }

        assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.107")).migrate())
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("둘 이상");

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM tb_dgstfn_info WHERE bbs_id = '" + BOARD_ID + "'"))
                    .as("중복을 지어내 지우지 않는다").isEqualTo(2);
            assertThat(count(s, "SELECT count(*) FROM information_schema.tables WHERE table_name = 'tb_bbs_rcmdtn_hstry'"))
                    .as("멈춘 마이그레이션은 추천 이력 테이블도 남기지 않는다").isZero();
            s.executeUpdate("DELETE FROM tb_dgstfn_info WHERE dgstfn_sn = 902");
        }

        flyway(MigrationVersion.fromVersion("2.107")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThatThrownBy(() -> insertRating(s, pstSn, 903, "rater", 4))
                    .as("같은 사람의 두 번째 평가").isInstanceOf(SQLException.class);
        }
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThatThrownBy(() -> insertRating(s, pstSn, 904, "other", 0))
                    .as("범위 밖 점수").isInstanceOf(SQLException.class);
        }
        try (var c = openConnection(); var s = c.createStatement()) {
            // 작성자가 없는 레거시 행끼리는 충돌하지 않는다(NULL 은 UNIQUE 비교에서 서로 다르다).
            s.executeUpdate("INSERT INTO tb_dgstfn_info (dgstfn_sn, bbs_id, pst_sn, dgstfn_scr, use_yn)"
                    + " VALUES (905, '" + BOARD_ID + "', " + pstSn + ", 3, 'Y'), (906, '" + BOARD_ID + "', " + pstSn + ", 3, 'Y')");

            s.executeUpdate("INSERT INTO tb_bbs_rcmdtn_hstry (pst_sn, user_id, crt_dt) VALUES (" + pstSn + ", 'ESNTL_LIKER', CURRENT_TIMESTAMP)");
            assertThatThrownBy(() -> s.executeUpdate("INSERT INTO tb_bbs_rcmdtn_hstry (pst_sn, user_id, crt_dt)"
                    + " VALUES (" + pstSn + ", 'ESNTL_LIKER', CURRENT_TIMESTAMP)"))
                    .as("같은 사람의 두 번째 추천").isInstanceOf(SQLException.class);
        }
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThatThrownBy(() -> s.executeUpdate("INSERT INTO tb_bbs_rcmdtn_hstry (pst_sn, user_id)"
                    + " VALUES (-1, 'ESNTL_LIKER')"))
                    .as("없는 게시글 추천").isInstanceOf(SQLException.class);
        }
    }

    private static void insertRating(Statement s, long pstSn, long sn, String rater, int score) throws SQLException {
        s.executeUpdate("INSERT INTO tb_dgstfn_info (dgstfn_sn, bbs_id, pst_sn, dgstfn_scr, use_yn, frst_rgtr_id)"
                + " VALUES (" + sn + ", '" + BOARD_ID + "', " + pstSn + ", " + score + ", 'Y', '" + rater + "')");
    }

    private long count(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
