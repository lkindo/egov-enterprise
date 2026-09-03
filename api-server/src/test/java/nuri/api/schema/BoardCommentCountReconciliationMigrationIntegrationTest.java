package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("게시글 활성 댓글 수 historical baseline 정합 마이그레이션")
class BoardCommentCountReconciliationMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("null·stale 댓글 수를 정합하고 잠금 경합·귀속 불명 행에는 전체 rollback한다")
    void reconcilesHistoricalCountsWithoutRacingCommentWrites() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.86")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (pst_sn, bbs_id, pst_ttl, use_yn, cmnt_cnt)
                    VALUES (920000000001, 'BBSMSTR_AAAAAAAAAAAA', 'null count', 'Y', NULL),
                           (920000000002, 'BBSMSTR_AAAAAAAAAAAA', 'stale count', 'Y', -4),
                           (920000000003, 'BBSMSTR_AAAAAAAAAAAA', 'already correct', 'N', 1)
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_comment (ans_sn, pst_sn, bbs_id, ans_cn, use_yn)
                    VALUES (920000000001, 920000000001, 'BBSMSTR_AAAAAAAAAAAA', 'active one', 'Y'),
                           (920000000002, 920000000001, 'BBSMSTR_AAAAAAAAAAAA', 'active two', 'Y'),
                           (920000000003, 920000000001, 'BBSMSTR_AAAAAAAAAAAA', 'deleted', 'N'),
                           (920000000004, 920000000003, 'BBSMSTR_AAAAAAAAAAAA', 'hidden post active comment', 'Y')
                    """);
        }

        assertWriterContentionFailsFastWithoutPartialChanges("tb_bbs_comment");
        assertWriterContentionFailsFastWithoutPartialChanges("tb_bbs_item");
        assertUnownedActiveCommentFailsWithoutPartialChanges();

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(commentCount(statement, 920000000001L)).isEqualTo(2);
            assertThat(commentCount(statement, 920000000002L)).isZero();
            assertThat(commentCount(statement, 920000000003L)).isEqualTo(1);
            assertThat(mismatchCount(statement)).isZero();
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM flyway_schema_history
                    WHERE version='2.87' AND success
                    """)).isEqualTo(1);
        }
    }

    private void assertWriterContentionFailsFastWithoutPartialChanges(String blockedTable) throws SQLException {
        try (Connection blocker = openConnection()) {
            blocker.setAutoCommit(false);
            try (Statement statement = blocker.createStatement()) {
                statement.execute("LOCK TABLE " + blockedTable + " IN ROW EXCLUSIVE MODE");
            }

            long startedAt = System.nanoTime();
            assertThatThrownBy(() -> flyway(null).migrate())
                    .as("%s 쓰기와 경합하면 snapshot을 추측하지 않고 V2_87 전체가 실패해야 한다",
                            blockedTable)
                    .isInstanceOf(FlywayException.class);
            assertThat(Duration.ofNanos(System.nanoTime() - startedAt))
                    .as("NOWAIT %s 쓰기 잠금 경합 실패 시간", blockedTable)
                    .isLessThan(Duration.ofSeconds(10));

            assertMigrationPendingAndOriginalCountsRemain();
            if ("tb_bbs_item".equals(blockedTable)) {
                assertCommentLockFromFailedMigrationWasReleased();
            }
            blocker.rollback();
        }
    }

    private void assertCommentLockFromFailedMigrationWasReleased() throws SQLException {
        try (Connection verifier = openConnection();
             Statement statement = verifier.createStatement()) {
            verifier.setAutoCommit(false);
            statement.execute("LOCK TABLE tb_bbs_comment IN SHARE ROW EXCLUSIVE MODE NOWAIT");
            verifier.rollback();
        }
    }

    private void assertUnownedActiveCommentFailsWithoutPartialChanges() throws SQLException {
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_comment (ans_sn, pst_sn, bbs_id, ans_cn, use_yn)
                    VALUES (920000000099, 920000000001, 'BBSMSTR_DDDDDDDDDDDD', 'wrong board ownership', 'Y')
                    """);
        }

        assertThatThrownBy(() -> flyway(null).migrate())
                .as("귀속 불명 활성 댓글을 제외해 false-green을 만들면 안 된다")
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("active board comment has no matching");
        assertMigrationPendingAndOriginalCountsRemain();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(statement.executeUpdate(
                    "DELETE FROM tb_bbs_comment WHERE ans_sn=920000000099")).isEqualTo(1);
        }
    }

    private void assertMigrationPendingAndOriginalCountsRemain() throws SQLException {
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(singleInt(statement, """
                    SELECT count(*) FROM flyway_schema_history
                    WHERE version='2.87' AND success
                    """)).isZero();
            assertThat(nullableCommentCount(statement, 920000000001L)).isNull();
            assertThat(commentCount(statement, 920000000002L)).isEqualTo(-4);
            assertThat(commentCount(statement, 920000000003L)).isEqualTo(1);
        }
    }

    private Integer nullableCommentCount(Statement statement, long pstSn) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT cmnt_cnt FROM tb_bbs_item WHERE pst_sn=" + pstSn)) {
            assertThat(result.next()).isTrue();
            return (Integer) result.getObject(1);
        }
    }

    private int commentCount(Statement statement, long pstSn) throws SQLException {
        Integer value = nullableCommentCount(statement, pstSn);
        assertThat(value).isNotNull();
        return value;
    }

    private int mismatchCount(Statement statement) throws SQLException {
        return singleInt(statement, """
                WITH active AS (
                    SELECT bbs_id, pst_sn, count(*)::integer AS active_count
                    FROM tb_bbs_comment
                    WHERE use_yn='Y'
                    GROUP BY bbs_id, pst_sn
                )
                SELECT count(*)
                FROM tb_bbs_item post
                LEFT JOIN active
                  ON active.bbs_id=post.bbs_id AND active.pst_sn=post.pst_sn
                WHERE post.cmnt_cnt IS DISTINCT FROM COALESCE(active.active_count, 0)
                """);
    }

    private int singleInt(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getInt(1);
        }
    }
}
