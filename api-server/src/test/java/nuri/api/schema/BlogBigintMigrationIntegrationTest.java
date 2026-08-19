package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("블로그 문자열 PK → BIGINT IDENTITY 폐포 마이그레이션")
class BlogBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 블로그·멤버십·게시물·게시판 참조를 숫자 키로 보존한다")
    void migratesExistingBlogClosureAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.68")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_blog_info (blog_id, blog_ttl, blog_intro_cn, use_yn, blog_yn)
                    VALUES ('BLOG_900001', '기존 블로그', '기존 블로그 소개', 'Y', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_blog_user_map (blog_id, user_id, mngr_yn, use_yn)
                    VALUES ('BLOG_900001', 'USRCNFRM_00000000001', 'Y', 'Y')
                    """);
            assertThat(statement.executeUpdate("""
                    UPDATE tb_bbs_master
                    SET blog_id = 'BLOG_900001', blog_yn = 'Y'
                    WHERE bbs_id = 'BBSMSTR_AAAAAAAAAAAA'
                    """)).isEqualTo(1);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (pst_id, bbs_id, up_pst_id, pst_ttl, use_yn, blog_id)
                    VALUES ('900003', 'BBSMSTR_AAAAAAAAAAAA', '0', '기존 블로그 글', 'Y', 'BLOG_900001')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long blogSn = singleLong(statement,
                    "SELECT blog_sn FROM tb_blog_info WHERE blog_ttl='기존 블로그'");
            assertThat(singleLong(statement,
                    "SELECT blog_sn FROM tb_blog_user_map WHERE user_id='USRCNFRM_00000000001'"))
                    .isEqualTo(blogSn);
            assertThat(singleLong(statement,
                    "SELECT blog_sn FROM tb_bbs_item WHERE pst_ttl='기존 블로그 글'"))
                    .isEqualTo(blogSn);
            assertThat(singleLong(statement,
                    "SELECT blog_sn FROM tb_bbs_master WHERE bbs_id='BBSMSTR_AAAAAAAAAAAA'"))
                    .isEqualTo(blogSn);

            for (String table : List.of("tb_blog_info", "tb_blog_user_map", "tb_bbs_item", "tb_bbs_master")) {
                assertThat(columnExists(statement, table, "blog_id")).isFalse();
                assertThat(columnExists(statement, table, "blog_sn")).isTrue();
            }
            assertThat(identityGeneration(statement, "tb_blog_info", "blog_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_blog_info", "blog_sn")).isEqualTo("public.sq_blog_sn");
            assertThat(primaryKeyColumns(statement, "tb_blog_info")).containsExactly("blog_sn");
            assertThat(primaryKeyColumns(statement, "tb_blog_user_map"))
                    .containsExactly("blog_sn", "user_id");
            assertThat(foreignKeyDefinition(statement, "fk_tb_blog_user_map_tb_blog_info"))
                    .isEqualTo("FOREIGN KEY (blog_sn) REFERENCES tb_blog_info(blog_sn)");

            statement.executeUpdate("""
                    INSERT INTO tb_blog_info (blog_ttl, blog_intro_cn, use_yn, blog_yn)
                    VALUES ('신규 자동 채번 블로그', '신규 소개', 'Y', 'Y')
                    """);
            assertThat(singleLong(statement,
                    "SELECT blog_sn FROM tb_blog_info WHERE blog_ttl='신규 자동 채번 블로그'"))
                    .isGreaterThan(blogSn);
        }
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s')
                """.formatted(tableName, columnName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private String identityGeneration(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private String serialSequence(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT pg_get_serial_sequence('%s', '%s')".formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private List<String> primaryKeyColumns(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
                WHERE tc.table_schema='public' AND tc.table_name='%s' AND tc.constraint_type='PRIMARY KEY'
                ORDER BY kcu.ordinal_position
                """.formatted(tableName))) {
            var columns = new java.util.ArrayList<String>();
            while (result.next()) columns.add(result.getString(1));
            return columns;
        }
    }

    private String foreignKeyDefinition(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conname='%s'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
