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
@DisplayName("도움말 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class HpcmBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 도움말 행을 보존하고 숫자 PK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.49")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_hlp_info (hlp_id, hlp_se_cd, hlp_dfn, hlp_expln)
                    VALUES ('HPCM_LEGACY_0000001', 'SYS', '기존 도움말', '기존 설명')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT hlp_sn, hlp_se_cd, hlp_dfn, hlp_expln
                    FROM tb_hlp_info
                    WHERE hlp_dfn = '기존 도움말'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("hlp_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("hlp_se_cd")).isEqualTo("SYS");
                assertThat(rows.getString("hlp_expln")).isEqualTo("기존 설명");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_hlp_info", "hlp_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_hlp_info", "hlp_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_hlp_info", "hlp_sn")).isEqualTo("public.sq_hlp_sn");
            assertThat(primaryKeyColumn(statement, "tb_hlp_info")).isEqualTo("hlp_sn");

            statement.executeUpdate("""
                    INSERT INTO tb_hlp_info (hlp_se_cd, hlp_dfn, hlp_expln)
                    VALUES ('SYS', '신규 도움말', '자동 채번 확인')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT hlp_sn FROM tb_hlp_info WHERE hlp_dfn = '신규 도움말'
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
                    SELECT 1
                    FROM information_schema.columns
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
                SELECT identity_generation
                FROM information_schema.columns
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
