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
@DisplayName("부서업무 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class DeptJobBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 부서업무 행과 outbound FK를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.56")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_dept_task_info (
                        dept_task_id, dept_task_nm, dept_task_cn, prrty_rnk, frst_rgtr_id
                    ) VALUES (
                        'TASK_LEGACY_000001', '기존 부서업무', '보존할 업무 내용', '2', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT dept_task_sn, dept_task_nm, dept_task_cn, prrty_rnk, frst_rgtr_id
                    FROM tb_dept_task_info WHERE dept_task_nm = '기존 부서업무'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("dept_task_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("dept_task_cn")).isEqualTo("보존할 업무 내용");
                assertThat(rows.getString("prrty_rnk")).isEqualTo("2");
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_dept_task_info", "dept_task_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_dept_task_info", "dept_task_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_dept_task_info", "dept_task_sn"))
                    .isEqualTo("public.sq_dept_task_sn");
            assertThat(primaryKeyColumn(statement, "tb_dept_task_info")).isEqualTo("dept_task_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_dept_task_info")).isEqualTo(3L);

            statement.executeUpdate("""
                    INSERT INTO tb_dept_task_info (dept_task_nm, prrty_rnk)
                    VALUES ('신규 부서업무', '1')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT dept_task_sn FROM tb_dept_task_info WHERE dept_task_nm = '신규 부서업무'
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
                    WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s'
                )
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
                SELECT a.attname
                FROM pg_constraint c
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
