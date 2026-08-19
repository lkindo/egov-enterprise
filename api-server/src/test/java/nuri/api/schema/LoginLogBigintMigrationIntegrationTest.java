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
@DisplayName("로그인 로그 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class LoginLogBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 로그인 로그를 보존하고 숫자 PK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.72")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_login_log
                        (log_id, user_id, lgn_ip_addr, cntn_mthd_cd, err_ocrn_yn, err_cd, crt_dt)
                    VALUES
                        ('LOGIN_LOG_LEGACY01', 'legacy-user', '10.0.0.7', 'LOGIN', 'Y', 'E_AUTH', CURRENT_TIMESTAMP)
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT lgn_sn, user_id, lgn_ip_addr, cntn_mthd_cd, err_ocrn_yn, err_cd
                    FROM tb_login_log
                    WHERE user_id = 'legacy-user'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("lgn_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("lgn_ip_addr")).isEqualTo("10.0.0.7");
                assertThat(rows.getString("cntn_mthd_cd")).isEqualTo("LOGIN");
                assertThat(rows.getString("err_ocrn_yn")).isEqualTo("Y");
                assertThat(rows.getString("err_cd")).isEqualTo("E_AUTH");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_login_log", "log_id")).isFalse();
            assertThat(columnDataType(statement, "tb_login_log", "lgn_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_login_log", "lgn_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_login_log", "lgn_sn")).isEqualTo("public.sq_lgn_sn");
            assertThat(primaryKeyColumn(statement, "tb_login_log")).isEqualTo("lgn_sn");

            statement.executeUpdate("""
                    INSERT INTO tb_login_log (user_id, cntn_mthd_cd, err_ocrn_yn)
                    VALUES ('new-user', 'LOGIN', 'N')
                    """);
            assertThat(singleLong(statement,
                    "SELECT lgn_sn FROM tb_login_log WHERE user_id='new-user'"))
                    .isGreaterThan(migratedSn);
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

    private String columnDataType(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT data_type FROM information_schema.columns
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

    private String primaryKeyColumn(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT a.attname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname='public' AND t.relname='%s' AND c.contype='p'
                ORDER BY k.ord
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
