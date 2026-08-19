package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("메모보고 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class MemoReportBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 메모보고 데이터를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.59")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_memo_rpt_info (
                        rpt_id, rpt_ttl, memo_rpt_ymd, user_id, rptr_id, rpt_cn,
                        drctn_mttr, frst_rgtr_id
                    ) VALUES (
                        'MEMO_LEGACY_0000001', '기존 메모보고', '20260814',
                        'writer-legacy', 'reader-legacy', '보존할 보고 내용',
                        '보존할 지시사항', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT memo_rpt_sn, memo_rpt_ymd, user_id, rptr_id, rpt_cn,
                           drctn_mttr, atch_file_sn, frst_rgtr_id
                    FROM tb_memo_rpt_info WHERE rpt_ttl = '기존 메모보고'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("memo_rpt_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("memo_rpt_ymd")).isEqualTo("20260814");
                assertThat(rows.getString("user_id")).isEqualTo("writer-legacy");
                assertThat(rows.getString("rptr_id")).isEqualTo("reader-legacy");
                assertThat(rows.getString("rpt_cn")).isEqualTo("보존할 보고 내용");
                assertThat(rows.getString("drctn_mttr")).isEqualTo("보존할 지시사항");
                assertThat(rows.getObject("atch_file_sn")).isNull();
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_memo_rpt_info", "rpt_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_memo_rpt_info", "memo_rpt_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_memo_rpt_info", "memo_rpt_sn"))
                    .isEqualTo("public.sq_memo_rpt_sn");
            assertThat(primaryKeyColumn(statement, "tb_memo_rpt_info")).isEqualTo("memo_rpt_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_memo_rpt_info")).isEqualTo(1L);

            statement.executeUpdate("""
                    INSERT INTO tb_memo_rpt_info (rpt_ttl, user_id, rptr_id)
                    VALUES ('신규 메모보고', 'writer-new', 'reader-new')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT memo_rpt_sn FROM tb_memo_rpt_info WHERE rpt_ttl = '신규 메모보고'
                    """)) {
                assertThat(generated.next()).isTrue();
                assertThat(generated.getLong(1)).isGreaterThan(migratedSn);
            }
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s')
                """.formatted(tableName, columnName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private String identityGeneration(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s'
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

    private String primaryKeyColumn(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT a.attname FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname = 'public' AND t.relname = '%s' AND c.contype = 'p'
                ORDER BY k.ord
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private long outboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND conrelid = '%s'::regclass
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
