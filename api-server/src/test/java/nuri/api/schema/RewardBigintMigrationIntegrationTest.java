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
@DisplayName("포상관리 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class RewardBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 포상 데이터를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.60")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_rward_manage (
                        rwrd_id, rwrd_user_id, rwrd_cd, rwrd_ymd, rwrd_nm,
                        cntrb_cn, confm_yn, frst_rgtr_id
                    ) VALUES (
                        'RWRD_LEGACY_0000001', 'winner-legacy', 'RWRD-01', '20260814',
                        '기존 포상', '보존할 공적 내용', 'N', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT rwrd_sn, rwrd_user_id, rwrd_cd, rwrd_ymd, cntrb_cn,
                           confm_yn, atch_file_id, frst_rgtr_id
                    FROM tb_rward_manage WHERE rwrd_nm = '기존 포상'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("rwrd_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("rwrd_user_id")).isEqualTo("winner-legacy");
                assertThat(rows.getString("rwrd_cd")).isEqualTo("RWRD-01");
                assertThat(rows.getString("rwrd_ymd")).isEqualTo("20260814");
                assertThat(rows.getString("cntrb_cn")).isEqualTo("보존할 공적 내용");
                assertThat(rows.getString("confm_yn")).isEqualTo("N");
                assertThat(rows.getString("atch_file_id")).isNull();
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_rward_manage", "rwrd_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_rward_manage", "rwrd_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_rward_manage", "rwrd_sn"))
                    .isEqualTo("public.sq_rwrd_sn");
            assertThat(primaryKeyColumn(statement, "tb_rward_manage")).isEqualTo("rwrd_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_rward_manage")).isEqualTo(1L);

            statement.executeUpdate("""
                    INSERT INTO tb_rward_manage (rwrd_user_id, rwrd_cd, rwrd_nm, confm_yn)
                    VALUES ('winner-new', 'RWRD-02', '신규 포상', 'Y')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT rwrd_sn FROM tb_rward_manage WHERE rwrd_nm = '신규 포상'
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
