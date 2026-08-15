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
@DisplayName("웹 로그 잘린 UUID PK → BIGINT IDENTITY 데이터 마이그레이션")
class WebLogBigintMigrationIntegrationTest {

    private static final int LEGACY_ROW_COUNT = 4_003;

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 4,003행과 검색 인덱스를 보존하고 자동 내부키로 전환한다")
    void migratesExistingVolumeAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.74")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_web_log
                        (dmnd_id, url, dmnd_user_id, dmnd_user_ip_addr, occr_ymd, prcs_tm)
                    SELECT
                        'WLOG_' || upper(lpad(to_hex(n), 13, '0')),
                        '/api/v1/legacy/' || n,
                        CASE WHEN n = 4003 THEN 'legacy-user' ELSE 'bulk-user' END,
                        CASE WHEN n = 4003 THEN '10.0.0.9' ELSE '127.0.0.1' END,
                        CASE WHEN n = 4003 THEN '20260814' ELSE '20260813' END,
                        n::bigint
                    FROM generate_series(1, 4003) AS n
                    """);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_web_log"))
                    .isEqualTo(LEGACY_ROW_COUNT);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_web_log"))
                    .isEqualTo(LEGACY_ROW_COUNT);
            assertThat(singleLong(statement, "SELECT count(DISTINCT web_log_sn) FROM tb_web_log"))
                    .isEqualTo(LEGACY_ROW_COUNT);

            long maxMigratedSn = singleLong(statement, "SELECT max(web_log_sn) FROM tb_web_log");
            assertThat(maxMigratedSn).isPositive();

            try (ResultSet row = statement.executeQuery("""
                    SELECT web_log_sn, url, dmnd_user_id, dmnd_user_ip_addr, occr_ymd, prcs_tm
                    FROM tb_web_log
                    WHERE url = '/api/v1/legacy/4003'
                    """)) {
                assertThat(row.next()).isTrue();
                assertThat(row.getLong("web_log_sn")).isPositive();
                assertThat(row.getString("dmnd_user_id")).isEqualTo("legacy-user");
                assertThat(row.getString("dmnd_user_ip_addr")).isEqualTo("10.0.0.9");
                assertThat(row.getString("occr_ymd")).isEqualTo("20260814");
                assertThat(row.getLong("prcs_tm")).isEqualTo(4003L);
                assertThat(row.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_web_log", "dmnd_id")).isFalse();
            assertThat(columnDataType(statement, "tb_web_log", "web_log_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_web_log", "web_log_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_web_log", "web_log_sn"))
                    .isEqualTo("public.sq_web_log_sn");
            assertThat(primaryKeyColumn(statement, "tb_web_log")).isEqualTo("web_log_sn");
            assertThat(standardTermDomain(statement, "WEB_LOG_SN")).isEqualTo("일련번호N19");

            assertThat(indexExists(statement, "ix_tb_web_log_occr_ymd")).isTrue();
            assertThat(indexExists(statement, "ix_tb_web_log_url_trgm")).isTrue();
            assertThat(indexExists(statement, "ix_tb_web_log_occr_ymd_url")).isTrue();

            statement.executeUpdate("""
                    INSERT INTO tb_web_log (url, dmnd_user_id, dmnd_user_ip_addr, occr_ymd, prcs_tm)
                    VALUES ('/api/v1/new', 'new-user', '10.0.0.10', '20260814', 7)
                    """);
            assertThat(singleLong(statement,
                    "SELECT web_log_sn FROM tb_web_log WHERE url='/api/v1/new'"))
                    .isGreaterThan(maxMigratedSn);
        }
    }

    private Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration");
        if (target != null) configuration.target(target);
        return configuration.load();
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

    private boolean indexExists(Statement statement, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM pg_indexes
                WHERE schemaname='public' AND tablename='tb_web_log' AND indexname='%s')
                """.formatted(indexName))) {
            result.next();
            return result.getBoolean(1);
        }
    }
}
