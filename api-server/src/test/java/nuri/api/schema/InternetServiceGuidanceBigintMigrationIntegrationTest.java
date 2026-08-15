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
@DisplayName("인터넷 서비스 안내 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class InternetServiceGuidanceBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 안내 행을 보존하고 표준 숫자 PK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.50")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_intrn_svc (itnt_svc_id, itnt_svc_nm, itnt_svc_expln, rflt_yn)
                    VALUES ('ISG_LEGACY_00000001', '기존 서비스', '기존 안내', 'Y')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT itnt_srvc_sn, itnt_svc_nm, itnt_svc_expln, rflt_yn
                    FROM tb_intrn_svc
                    WHERE itnt_svc_nm = '기존 서비스'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("itnt_srvc_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("itnt_svc_expln")).isEqualTo("기존 안내");
                assertThat(rows.getString("rflt_yn")).isEqualTo("Y");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_intrn_svc", "itnt_svc_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_intrn_svc", "itnt_srvc_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_intrn_svc", "itnt_srvc_sn"))
                    .isEqualTo("public.sq_itnt_srvc_sn");
            assertThat(primaryKeyColumn(statement, "tb_intrn_svc")).isEqualTo("itnt_srvc_sn");

            statement.executeUpdate("""
                    INSERT INTO tb_intrn_svc (itnt_svc_nm, itnt_svc_expln, rflt_yn)
                    VALUES ('신규 서비스', '자동 채번 확인', 'N')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT itnt_srvc_sn FROM tb_intrn_svc WHERE itnt_svc_nm = '신규 서비스'
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
}
