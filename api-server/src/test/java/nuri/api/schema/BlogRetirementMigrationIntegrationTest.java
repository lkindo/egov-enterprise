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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

@Tag("schema-validation")
@DisplayName("블로그 퇴역의 쓰기 차단·의존성 거부·업무 데이터 보존")
class BlogRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_ID = "BBSMSTR_AAAAAAAAAAAA";
    private static final long POST_SN = 920000000101L;
    private static final List<String> PRESERVED_TABLES =
            List.of("tb_bbs_master", "tb_bbs_item", "tb_user_info", "tb_tmplt_info");

    @Test
    @DisplayName("사용 중이면 중단하고, 빈 도메인만 제거하며 실패한 Contract는 전부 롤백한다")
    void fencesWritesAndRetiresOnlyEmptyBlogDomainWithoutLosingBusinessRows() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.88")).migrate();

        // 클래스별 DB를 공유하므로 실패·복구·성공 경로를 한 테스트에서 순서대로 진행한다.
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_tmplt_info (tmplt_id, tmplt_nm, tmplt_se_cd, tmplt_path, use_yn)
                    VALUES ('RETIRE_TMPLT_KEEP', '보존할 템플릿', 'TMPT01', '/retirement-test', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (pst_sn, bbs_id, pst_ttl, use_yn)
                    VALUES (%d, '%s', '퇴역 후에도 보존할 게시글', 'Y')
                    """.formatted(POST_SN, BOARD_ID));
            Map<String, Long> originalCounts = rowCounts(statement);
            originalCounts.forEach((table, count) -> assertThat(count).as(table).isPositive());

            long blogSn = singleLong(statement, """
                    INSERT INTO tb_blog_info (blog_ttl, use_yn, blog_yn)
                    VALUES ('퇴역을 차단해야 하는 블로그', 'Y', 'Y') RETURNING blog_sn
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_blog_user_map (blog_sn, user_id, mngr_yn, use_yn)
                    VALUES (%d, 'USRCNFRM_00000000001', 'Y', 'Y')
                    """.formatted(blogSn));

            assertMigrationRejected("2.89", "23514");
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_blog_info WHERE blog_sn=" + blogSn))
                    .as("실패한 fence는 기존 블로그를 삭제하지 않는다").isEqualTo(1);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_blog_user_map WHERE blog_sn=" + blogSn))
                    .as("실패한 fence는 기존 멤버십을 삭제하지 않는다").isEqualTo(1);
            assertNotApplied(statement, "2.89");
            assertThat(constraintExists(statement, "ck_tb_blog_info_retired")).isFalse();
            assertThat(rowCounts(statement)).isEqualTo(originalCounts);
            statement.executeUpdate("DELETE FROM tb_blog_user_map WHERE blog_sn=" + blogSn);
            statement.executeUpdate("DELETE FROM tb_blog_info WHERE blog_sn=" + blogSn);

            // 블로그 행이 없어도 각 논리 참조가 남아 있으면 Expand를 거부해야 한다.
            assertReferenceBlocksFence(statement, "tb_bbs_master", "blog_sn", "91", "NULL",
                    "bbs_id='" + BOARD_ID + "'");
            assertReferenceBlocksFence(statement, "tb_bbs_master", "blog_yn", "'Y'", "'N'",
                    "bbs_id='" + BOARD_ID + "'");
            assertReferenceBlocksFence(statement, "tb_bbs_item", "blog_sn", "91", "NULL",
                    "pst_sn=" + POST_SN);

            flyway(MigrationVersion.fromVersion("2.89")).migrate();
            assertThat(successfulMigrations(statement, "2.89")).isEqualTo(1);
            assertCheckRejected(statement, """
                    INSERT INTO tb_blog_info (blog_ttl, use_yn, blog_yn)
                    VALUES ('쓰기가 차단되어야 하는 블로그', 'Y', 'Y')
                    """);
            assertCheckRejected(statement, "UPDATE tb_bbs_master SET blog_sn=91 WHERE bbs_id='" + BOARD_ID + "'");
            assertCheckRejected(statement, "UPDATE tb_bbs_master SET blog_yn='Y' WHERE bbs_id='" + BOARD_ID + "'");
            assertCheckRejected(statement, "UPDATE tb_bbs_item SET blog_sn=91 WHERE pst_sn=" + POST_SN);
            assertThat(statement.executeUpdate("UPDATE tb_bbs_item SET pst_ttl='일반 게시글 수정 가능' WHERE pst_sn=" + POST_SN))
                    .as("fence 이후 일반 게시글 수정은 허용한다").isEqualTo(1);

            statement.execute("CREATE VIEW vw_blog_retirement_blocker AS SELECT blog_sn FROM tb_blog_info");
            assertMigrationRejected("2.90", "2BP01");
            assertNotApplied(statement, "2.90");
            assertBlogObjectsExist(statement, true);
            assertThat(relationExists(statement, "vw_blog_retirement_blocker"))
                    .as("예상 밖 의존성은 CASCADE로 지우지 않는다").isTrue();
            for (String constraint : List.of("ck_tb_blog_info_retired", "ck_tb_blog_user_map_retired",
                    "ck_tb_bbs_master_blog_retired", "ck_tb_bbs_item_blog_retired")) {
                assertThat(constraintExists(statement, constraint)).as("실패 후 복구된 제약 %s", constraint).isTrue();
            }
            assertThat(rowCounts(statement)).as("실패한 Contract의 업무 데이터").isEqualTo(originalCounts);

            statement.execute("DROP VIEW vw_blog_retirement_blocker");
            flyway(MigrationVersion.fromVersion("2.90")).migrate();
            assertThat(successfulMigrations(statement, "2.90")).isEqualTo(1);
            assertBlogObjectsExist(statement, false);
            assertThat(rowCounts(statement)).as("성공한 Contract도 기존 업무 행 수를 보존한다").isEqualTo(originalCounts);

            assertThat(statement.executeUpdate("""
                    INSERT INTO tb_bbs_master
                        (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)
                    SELECT 'RETIRE_BOARD_NEW', '퇴역 후 일반 게시판', bbs_type_cd, bbs_atrb_cd, 0, 'N', 'Y'
                    FROM tb_bbs_master WHERE bbs_id='%s'
                    """.formatted(BOARD_ID))).isEqualTo(1);
            assertThat(statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn)
                    VALUES ('RETIRE_BOARD_NEW', '퇴역 후 일반 게시글', 'Y')
                    """)).isEqualTo(1);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_bbs_master"))
                    .isEqualTo(originalCounts.get("tb_bbs_master") + 1);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_bbs_item"))
                    .isEqualTo(originalCounts.get("tb_bbs_item") + 1);
        }
    }

    private void assertReferenceBlocksFence(Statement statement, String table, String column,
                                            String value, String clearedValue, String predicate) throws SQLException {
        assertThat(statement.executeUpdate("UPDATE " + table + " SET " + column + "=" + value + " WHERE " + predicate))
                .isEqualTo(1);
        assertMigrationRejected("2.89", "23514");
        assertNotApplied(statement, "2.89");
        assertThat(singleLong(statement, "SELECT count(*) FROM " + table + " WHERE " + predicate + " AND " + column + "=" + value))
                .as("거부된 마이그레이션은 %s.%s 참조를 지우지 않는다", table, column).isEqualTo(1);
        assertThat(constraintExists(statement, "ck_tb_blog_info_retired"))
                .as("앞서 추가한 fence도 실패 시 롤백한다").isFalse();
        assertThat(statement.executeUpdate("UPDATE " + table + " SET " + column + "=" + clearedValue + " WHERE " + predicate))
                .isEqualTo(1);
    }

    private void assertMigrationRejected(String target, String sqlState) {
        Throwable failure = catchThrowable(() -> flyway(MigrationVersion.fromVersion(target)).migrate());
        assertThat(failure).isInstanceOf(FlywayException.class);
        Throwable root = failure;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        assertThat(root).isInstanceOf(SQLException.class);
        assertThat(((SQLException) root).getSQLState()).as("V%s 실패 원인", target).isEqualTo(sqlState);
    }

    private void assertCheckRejected(Statement statement, String sql) {
        Throwable failure = catchThrowable(() -> statement.executeUpdate(sql));
        assertThat(failure).isInstanceOf(SQLException.class);
        assertThat(((SQLException) failure).getSQLState()).isEqualTo("23514");
    }

    private void assertBlogObjectsExist(Statement statement, boolean expected) throws SQLException {
        for (String relation : List.of("tb_blog_info", "tb_blog_user_map", "sq_blog_sn")) {
            assertThat(relationExists(statement, relation)).as(relation).isEqualTo(expected);
        }
        assertThat(columnExists(statement, "tb_bbs_master", "blog_sn")).isEqualTo(expected);
        assertThat(columnExists(statement, "tb_bbs_master", "blog_yn")).isEqualTo(expected);
        assertThat(columnExists(statement, "tb_bbs_item", "blog_sn")).isEqualTo(expected);
    }

    private Map<String, Long> rowCounts(Statement statement) throws SQLException {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : PRESERVED_TABLES) {
            counts.put(table, singleLong(statement, "SELECT count(*) FROM " + table));
        }
        return counts;
    }

    private void assertNotApplied(Statement statement, String version) throws SQLException {
        assertThat(successfulMigrations(statement, version)).as("V%s 미적용", version).isZero();
    }

    private long successfulMigrations(Statement statement, String version) throws SQLException {
        return singleLong(statement, "SELECT count(*) FROM flyway_schema_history WHERE version='" + version + "' AND success");
    }

    private boolean relationExists(Statement statement, String name) throws SQLException {
        return singleLong(statement, "SELECT count(*) FROM pg_class WHERE oid=to_regclass('public." + name + "')") == 1;
    }

    private boolean constraintExists(Statement statement, String name) throws SQLException {
        return singleLong(statement, "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname='" + name + "'") == 1;
    }

    private boolean columnExists(Statement statement, String table, String column) throws SQLException {
        return singleLong(statement, """
                SELECT count(*) FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                """.formatted(table, column)) == 1;
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            long value = result.getLong(1);
            assertThat(result.next()).isFalse();
            return value;
        }
    }
}
