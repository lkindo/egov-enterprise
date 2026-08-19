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
@DisplayName("업무보고 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class WorkReportBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 업무보고와 첨부 FK를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.64")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_rpt_info (
                        rpt_id, rpt_ttl, rpt_cn, rpt_se_cd, rpt_stts_cd,
                        rpt_ymd, user_id, frst_rgtr_id
                    ) VALUES (
                        'RPT_LEGACY_0000001', '기존 업무보고', '보존할 보고 내용',
                        '1', 'R', '20260814', 'legacy-user', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT rptp_sn, rpt_ttl, rpt_cn, rpt_se_cd, rpt_stts_cd,
                           rpt_ymd, user_id, frst_rgtr_id
                    FROM tb_rpt_info WHERE rpt_ttl = '기존 업무보고'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("rptp_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("rpt_cn")).isEqualTo("보존할 보고 내용");
                assertThat(rows.getString("rpt_se_cd")).isEqualTo("1");
                assertThat(rows.getString("rpt_stts_cd")).isEqualTo("R");
                assertThat(rows.getString("rpt_ymd")).isEqualTo("20260814");
                assertThat(rows.getString("user_id")).isEqualTo("legacy-user");
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_rpt_info", "rpt_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_rpt_info", "rptp_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_rpt_info", "rptp_sn"))
                    .isEqualTo("public.sq_rptp_sn");
            assertThat(primaryKeyColumn(statement, "tb_rpt_info")).isEqualTo("rptp_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_rpt_info")).isEqualTo(1L);
            assertThat(inboundForeignKeyCount(statement, "tb_rpt_info")).isZero();

            statement.executeUpdate("""
                    INSERT INTO tb_rpt_info (rpt_ttl, user_id)
                    VALUES ('신규 업무보고', 'new-user')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT rptp_sn FROM tb_rpt_info WHERE rpt_ttl = '신규 업무보고'
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
        return foreignKeyCount(statement, "conrelid", tableName);
    }

    private long inboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        return foreignKeyCount(statement, "confrelid", tableName);
    }

    private long foreignKeyCount(Statement statement, String relationColumn, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND %s = '%s'::regclass
                """.formatted(relationColumn, tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
