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
@DisplayName("자료사용통계 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class DtaUseStatsBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 통계 데이터를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.58")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_dta_use_stats (
                        dta_use_stats_id, bbs_id, file_sn, frst_rgtr_id
                    ) VALUES (
                        'DTA_USE_LEGACY_0001', 'BBS_LEGACY_00000001', 7, 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT dta_use_stats_sn, bbs_id, pst_sn, atch_file_id, file_sn, frst_rgtr_id
                    FROM tb_dta_use_stats WHERE bbs_id = 'BBS_LEGACY_00000001'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("dta_use_stats_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getObject("pst_sn")).isNull();
                assertThat(rows.getString("atch_file_id")).isNull();
                assertThat(rows.getInt("file_sn")).isEqualTo(7);
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_dta_use_stats", "dta_use_stats_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_dta_use_stats", "dta_use_stats_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_dta_use_stats", "dta_use_stats_sn"))
                    .isEqualTo("public.sq_dta_use_stats_sn");
            assertThat(primaryKeyColumn(statement, "tb_dta_use_stats")).isEqualTo("dta_use_stats_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_dta_use_stats")).isEqualTo(2L);

            statement.executeUpdate("""
                    INSERT INTO tb_dta_use_stats (bbs_id, file_sn)
                    VALUES ('BBS_NEW_00000000001', 9)
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT dta_use_stats_sn FROM tb_dta_use_stats
                    WHERE bbs_id = 'BBS_NEW_00000000001'
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
        if (target != null) configuration.target(target);
        return configuration.load();
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
