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
@DisplayName("마이페이지 콘텐츠 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class MyPageContentBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 콘텐츠 행을 보존하고 표준 숫자 PK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.53")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_indv_pg_conts (
                        cntnts_id, cntnts_nm, cntc_url, cntnts_use_yn, cntnts_link_url, cntnts_dc
                    ) VALUES (
                        'MYP_LEGACY_00000001', '기존 위젯', '/connect', 'Y', '/linked', '기존 설명'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT conts_sn, cntnts_nm, cntc_url, cntnts_use_yn, cntnts_link_url, cntnts_dc
                    FROM tb_indv_pg_conts
                    WHERE cntnts_nm = '기존 위젯'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("conts_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("cntc_url")).isEqualTo("/connect");
                assertThat(rows.getString("cntnts_use_yn")).isEqualTo("Y");
                assertThat(rows.getString("cntnts_link_url")).isEqualTo("/linked");
                assertThat(rows.getString("cntnts_dc")).isEqualTo("기존 설명");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_indv_pg_conts", "cntnts_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_indv_pg_conts", "conts_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_indv_pg_conts", "conts_sn")).isEqualTo("public.sq_conts_sn");
            assertThat(primaryKeyColumn(statement, "tb_indv_pg_conts")).isEqualTo("conts_sn");

            statement.executeUpdate("""
                    INSERT INTO tb_indv_pg_conts (cntnts_nm, cntnts_use_yn)
                    VALUES ('신규 위젯', 'N')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT conts_sn FROM tb_indv_pg_conts WHERE cntnts_nm = '신규 위젯'
                    """)) {
                assertThat(generated.next()).isTrue();
                assertThat(generated.getLong(1)).isGreaterThan(migratedSn);
            }
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = '%s'
                      AND column_name = '%s'
                )
                """.formatted(tableName, columnName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private String identityGeneration(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '%s'
                  AND column_name = '%s'
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
                SELECT a.attname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname = 'public'
                  AND t.relname = '%s'
                  AND c.contype = 'p'
                ORDER BY k.ord
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
