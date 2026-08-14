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
@DisplayName("스크랩 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class ScrapBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 스크랩과 게시물 FK를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.62")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_scrap (
                        scrap_id, bbs_id, scrap_nm, scrap_url, scrap_expln,
                        use_yn, frst_rgtr_id
                    ) VALUES (
                        'SCRAP_LEGACY_000001', 'BBS_LEGACY_00000001', '기존 스크랩',
                        'https://legacy.example.com', '보존할 스크랩 설명', 'Y', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT scrap_sn, bbs_id, pst_id, scrap_url, scrap_expln,
                           use_yn, frst_rgtr_id
                    FROM tb_bbs_scrap WHERE scrap_nm = '기존 스크랩'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("scrap_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("bbs_id")).isEqualTo("BBS_LEGACY_00000001");
                assertThat(rows.getString("pst_id")).isNull();
                assertThat(rows.getString("scrap_url")).isEqualTo("https://legacy.example.com");
                assertThat(rows.getString("scrap_expln")).isEqualTo("보존할 스크랩 설명");
                assertThat(rows.getString("use_yn")).isEqualTo("Y");
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_bbs_scrap", "scrap_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_bbs_scrap", "scrap_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_bbs_scrap", "scrap_sn"))
                    .isEqualTo("public.sq_scrap_sn");
            assertThat(primaryKeyColumn(statement, "tb_bbs_scrap")).isEqualTo("scrap_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_bbs_scrap")).isEqualTo(1L);

            statement.executeUpdate("""
                    INSERT INTO tb_bbs_scrap (scrap_nm, scrap_url, use_yn)
                    VALUES ('신규 스크랩', 'https://new.example.com', 'N')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT scrap_sn FROM tb_bbs_scrap WHERE scrap_nm = '신규 스크랩'
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
