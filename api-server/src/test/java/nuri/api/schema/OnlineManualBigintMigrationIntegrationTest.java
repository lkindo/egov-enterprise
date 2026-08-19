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
@DisplayName("온라인 매뉴얼 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class OnlineManualBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 매뉴얼 행을 보존하고 표준 숫자 PK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.51")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_onln_mnl_info (
                        onln_mnl_id, onln_mnl_nm, onln_mnl_se_cd, onln_mnl_dfn, onln_mnl_expln
                    ) VALUES (
                        'MNL_LEGACY_00000001', '기존 매뉴얼', 'GUIDE', '기존 정의', '기존 설명'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT onln_mnl_sn, onln_mnl_nm, onln_mnl_se_cd, onln_mnl_dfn, onln_mnl_expln
                    FROM tb_onln_mnl_info
                    WHERE onln_mnl_nm = '기존 매뉴얼'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("onln_mnl_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("onln_mnl_se_cd")).isEqualTo("GUIDE");
                assertThat(rows.getString("onln_mnl_dfn")).isEqualTo("기존 정의");
                assertThat(rows.getString("onln_mnl_expln")).isEqualTo("기존 설명");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_onln_mnl_info", "onln_mnl_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_onln_mnl_info", "onln_mnl_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_onln_mnl_info", "onln_mnl_sn"))
                    .isEqualTo("public.sq_onln_mnl_sn");
            assertThat(primaryKeyColumn(statement, "tb_onln_mnl_info")).isEqualTo("onln_mnl_sn");
            assertThat(constraintExists(statement, "uk_tb_onln_mnl_info_onln_mnl_id")).isFalse();

            statement.executeUpdate("""
                    INSERT INTO tb_onln_mnl_info (
                        onln_mnl_nm, onln_mnl_se_cd, onln_mnl_dfn, onln_mnl_expln
                    ) VALUES (
                        '신규 매뉴얼', 'GUIDE', '신규 정의', '자동 채번 확인'
                    )
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT onln_mnl_sn FROM tb_onln_mnl_info WHERE onln_mnl_nm = '신규 매뉴얼'
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

    private boolean constraintExists(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_schema = 'public'
                      AND constraint_name = '%s'
                )
                """.formatted(constraintName))) {
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
