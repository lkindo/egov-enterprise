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
@DisplayName("사용자 알림 문자열 PK -> BIGINT IDENTITY 마이그레이션")
class NotificationBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 알림과 사용자 FK를 보존하고 DB 자동 번호를 발급한다")
    void migratesLegacyNotificationAndPreservesReceiverRelationship() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.80")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_user_noti (
                        noti_sn, noti_ttl_nm, noti_cn, rcvr_id, read_yn,
                        link_url, noti_dt, noti_ivl_val
                    ) VALUES (
                        'NTFC_LEGACY_00001', '기존 보안 알림', '기존 알림 내용',
                        'USRCNFRM_00000000001', 'N', '/admin/security',
                        TIMESTAMP '2026-08-14 13:00:00', 'ONCE'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT noti_sn, noti_ttl_nm, noti_cn, rcvr_id, read_yn,
                           link_url, noti_dt, noti_ivl_val
                    FROM tb_user_noti WHERE noti_ttl_nm = '기존 보안 알림'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("noti_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("noti_cn")).isEqualTo("기존 알림 내용");
                assertThat(rows.getString("rcvr_id")).isEqualTo("USRCNFRM_00000000001");
                assertThat(rows.getString("read_yn")).isEqualTo("N");
                assertThat(rows.getString("link_url")).isEqualTo("/admin/security");
                assertThat(rows.getString("noti_ivl_val")).isEqualTo("ONCE");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnDataType(statement, "tb_user_noti", "noti_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_user_noti", "noti_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_user_noti", "noti_sn"))
                    .isEqualTo("public.sq_noti_sn");
            assertThat(primaryKeyColumn(statement, "tb_user_noti")).isEqualTo("noti_sn");
            assertThat(constraintIsValidated(statement, "fk_tb_user_noti_tb_user_info")).isTrue();
            assertThat(constraintExists(statement, "ck_tb_user_noti_read_yn", "c")).isTrue();
            assertThat(indexExists(statement, "ix_tb_user_noti_rcvr_id")).isTrue();
            assertThat(standardTermDomain(statement, "NOTI_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_user_noti (noti_ttl_nm, rcvr_id, read_yn)
                    VALUES ('신규 알림', 'USRCNFRM_00000000001', 'N')
                    RETURNING noti_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);
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

    private boolean constraintIsValidated(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT convalidated FROM pg_constraint WHERE conname='%s'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }

    private boolean constraintExists(Statement statement, String constraintName, String type) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname='%s' AND contype='%s'
                )
                """.formatted(constraintName, type))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }

    private boolean indexExists(Statement statement, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname='public' AND indexname='%s'
                )
                """.formatted(indexName))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
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
}
