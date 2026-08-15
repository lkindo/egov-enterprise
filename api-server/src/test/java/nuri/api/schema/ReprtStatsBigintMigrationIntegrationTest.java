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
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@Testcontainers(disabledWithoutDocker = false)
@DisplayName("보고서 통계 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class ReprtStatsBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 보고서 통계를 보존하고 신규 일련번호를 DB에서 발급한다")
    void migratesLegacyRowAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.76")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_rptp_stats (
                        reprt_id, rptp_nm, reprt_sttus, reprt_type, crt_dt
                    ) VALUES (
                        'REPRT_LEGACY_000001', '기존 보고서', 'P', 'A',
                        TIMESTAMP '2026-08-14 09:00:00'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT rptp_sn, rptp_nm, reprt_sttus, reprt_type, crt_dt
                    FROM tb_rptp_stats
                    WHERE rptp_nm = '기존 보고서'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("rptp_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("rptp_nm")).isEqualTo("기존 보고서");
                assertThat(rows.getString("reprt_sttus")).isEqualTo("P");
                assertThat(rows.getString("reprt_type")).isEqualTo("A");
                assertThat(rows.getTimestamp("crt_dt").toLocalDateTime())
                        .isEqualTo(LocalDateTime.parse("2026-08-14T09:00:00"));
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_rptp_stats", "reprt_id")).isFalse();
            assertThat(columnDataType(statement, "tb_rptp_stats", "rptp_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_rptp_stats", "rptp_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_rptp_stats", "rptp_sn"))
                    .isEqualTo("public.sq_rptp_stats_sn");
            assertThat(primaryKeyColumn(statement, "tb_rptp_stats")).isEqualTo("rptp_sn");
            assertThat(standardTermDomain(statement, "RPTP_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_rptp_stats (rptp_nm, reprt_sttus, reprt_type, crt_dt)
                    VALUES ('신규 보고서', 'R', 'B', TIMESTAMP '2026-08-14 10:00:00')
                    RETURNING rptp_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_rptp_stats")).isEqualTo(2L);
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
                    WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                )
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
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

    private String standardTermDomain(Statement statement, String abbreviation) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT domain_name FROM meta_standard_terms WHERE eng_abbr='%s'
                """.formatted(abbreviation))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
