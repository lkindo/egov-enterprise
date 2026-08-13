package nuri.api.schema;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@Testcontainers(disabledWithoutDocker = false)
@DisplayName("부서업무함 문자열 PK/FK → BIGINT IDENTITY 데이터 마이그레이션")
class DeptJobBoxBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 업무함과 산하 업무를 보존하고 숫자 FK로 재결속한다")
    void migratesExistingParentAndChildRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.54")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_dept_job_bx (
                        dept_task_box_id, dept_task_box_nm, dept_id, sort_ordr
                    ) VALUES (
                        'BOX_LEGACY_00000001', '기존 업무함', 'DEPT_LEGACY', 7
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_dept_task_info (
                        dept_task_id, dept_task_box_id, dept_task_nm, dept_task_cn, prrty_rnk
                    ) VALUES (
                        'TASK_LEGACY_000001', 'BOX_LEGACY_00000001', '기존 업무', '기존 내용', '2'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT box.dept_task_box_sn, box.dept_task_box_nm, box.dept_id, box.sort_ordr,
                           task.dept_task_nm, task.dept_task_cn, task.prrty_rnk
                    FROM tb_dept_job_bx box
                    JOIN tb_dept_task_info task
                      ON task.dept_task_box_sn = box.dept_task_box_sn
                    WHERE task.dept_task_id = 'TASK_LEGACY_000001'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("dept_task_box_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("dept_task_box_nm")).isEqualTo("기존 업무함");
                assertThat(rows.getString("dept_id")).isEqualTo("DEPT_LEGACY");
                assertThat(rows.getLong("sort_ordr")).isEqualTo(7L);
                assertThat(rows.getString("dept_task_nm")).isEqualTo("기존 업무");
                assertThat(rows.getString("dept_task_cn")).isEqualTo("기존 내용");
                assertThat(rows.getString("prrty_rnk")).isEqualTo("2");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_dept_job_bx", "dept_task_box_id")).isFalse();
            assertThat(columnExists(statement, "tb_dept_task_info", "dept_task_box_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_dept_job_bx", "dept_task_box_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_dept_job_bx", "dept_task_box_sn"))
                    .isEqualTo("public.sq_dept_task_box_sn");
            assertThat(primaryKeyColumn(statement, "tb_dept_job_bx")).isEqualTo("dept_task_box_sn");
            assertThat(foreignKeyIsValidated(statement, "fk_tb_dept_task_info_tb_dept_job_bx")).isTrue();

            statement.executeUpdate("""
                    INSERT INTO tb_dept_job_bx (dept_task_box_nm, sort_ordr)
                    VALUES ('신규 업무함', 8)
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT dept_task_box_sn FROM tb_dept_job_bx WHERE dept_task_box_nm = '신규 업무함'
                    """)) {
                assertThat(generated.next()).isTrue();
                assertThat(generated.getLong(1)).isGreaterThan(migratedSn);
            }
        }
    }

    private Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration");
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
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

    private boolean foreignKeyIsValidated(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT convalidated FROM pg_constraint WHERE conname = '%s'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }
}
