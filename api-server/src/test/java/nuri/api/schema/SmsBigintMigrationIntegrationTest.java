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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@Testcontainers(disabledWithoutDocker = false)
@DisplayName("SMS 문자열 PK/FK → BIGINT IDENTITY 관계 마이그레이션")
class SmsBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 발송·수신 관계를 보존하고 신규 전송 일련번호를 DB에서 발급한다")
    void migratesLegacySmsGraphAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.82")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_sms_info (
                        sms_id, sndng_telno, sndng_cn,
                        crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id
                    ) VALUES (
                        'SMS_LEGACY_000001', '0212345678', 'legacy message',
                        TIMESTAMP '2026-08-14 16:00:00', TIMESTAMP '2026-08-14 16:30:00',
                        'legacy-admin', 'legacy-editor'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_sms_rcptn (
                        sms_id, rcptn_telno, rslt_cd, rslt_msg,
                        crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id
                    ) VALUES (
                        'SMS_LEGACY_000001', '01033334444', 'S', 'legacy success',
                        TIMESTAMP '2026-08-14 16:01:00', TIMESTAMP '2026-08-14 16:31:00',
                        'legacy-admin', 'legacy-editor'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT sms.sms_trsm_sn, sms.sndng_telno, sms.sndng_cn,
                           sms.crt_dt, sms.mdfcn_dt, sms.frst_rgtr_id, sms.last_mdfr_id,
                           recipient.rcptn_telno, recipient.rslt_cd, recipient.rslt_msg,
                           recipient.crt_dt AS recipient_crt_dt,
                           recipient.mdfcn_dt AS recipient_mdfcn_dt,
                           recipient.frst_rgtr_id AS recipient_frst_rgtr_id,
                           recipient.last_mdfr_id AS recipient_last_mdfr_id
                    FROM tb_sms_info sms
                    JOIN tb_sms_rcptn recipient USING (sms_trsm_sn)
                    WHERE sms.sndng_cn = 'legacy message'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("sms_trsm_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("sndng_telno")).isEqualTo("0212345678");
                assertThat(rows.getTimestamp("crt_dt").toLocalDateTime())
                        .isEqualTo(LocalDateTime.parse("2026-08-14T16:00:00"));
                assertThat(rows.getTimestamp("mdfcn_dt").toLocalDateTime())
                        .isEqualTo(LocalDateTime.parse("2026-08-14T16:30:00"));
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-admin");
                assertThat(rows.getString("last_mdfr_id")).isEqualTo("legacy-editor");
                assertThat(rows.getString("rcptn_telno")).isEqualTo("01033334444");
                assertThat(rows.getString("rslt_cd")).isEqualTo("S");
                assertThat(rows.getString("rslt_msg")).isEqualTo("legacy success");
                assertThat(rows.getTimestamp("recipient_crt_dt").toLocalDateTime())
                        .isEqualTo(LocalDateTime.parse("2026-08-14T16:01:00"));
                assertThat(rows.getTimestamp("recipient_mdfcn_dt").toLocalDateTime())
                        .isEqualTo(LocalDateTime.parse("2026-08-14T16:31:00"));
                assertThat(rows.getString("recipient_frst_rgtr_id")).isEqualTo("legacy-admin");
                assertThat(rows.getString("recipient_last_mdfr_id")).isEqualTo("legacy-editor");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_sms_info", "sms_id")).isFalse();
            assertThat(columnExists(statement, "tb_sms_rcptn", "sms_id")).isFalse();
            assertThat(columnDataType(statement, "tb_sms_info", "sms_trsm_sn")).isEqualTo("bigint");
            assertThat(columnDataType(statement, "tb_sms_rcptn", "sms_trsm_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_sms_info", "sms_trsm_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_sms_info", "sms_trsm_sn"))
                    .isEqualTo("public.sq_sms_trsm_sn");
            assertThat(primaryKeyColumns(statement, "tb_sms_info")).containsExactly("sms_trsm_sn");
            assertThat(primaryKeyColumns(statement, "tb_sms_rcptn"))
                    .containsExactly("rcptn_telno", "sms_trsm_sn");
            assertThat(foreignKeyDefinition(statement, "fk_tb_sms_rcptn_tb_sms_info"))
                    .isEqualTo("FOREIGN KEY (sms_trsm_sn) REFERENCES tb_sms_info(sms_trsm_sn)");
            assertThat(constraintValidated(statement, "fk_tb_sms_rcptn_tb_sms_info")).isTrue();
            assertThat(indexDefinition(statement, "ix_tb_sms_rcptn_sms_trsm_sn"))
                    .contains("(sms_trsm_sn)");
            assertThat(standardTermDomain(statement, "SMS_TRSM_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_sms_info (sndng_telno, sndng_cn)
                    VALUES ('0211112222', 'new message')
                    RETURNING sms_trsm_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);
            statement.executeUpdate("""
                    INSERT INTO tb_sms_rcptn (sms_trsm_sn, rcptn_telno, rslt_cd)
                    VALUES (%d, '01055556666', 'P')
                    """.formatted(generatedSn));
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_sms_info")).isEqualTo(2L);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_sms_rcptn")).isEqualTo(2L);
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

    private List<String> primaryKeyColumns(Statement statement, String tableName) throws SQLException {
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
            List<String> columns = new ArrayList<>();
            while (result.next()) {
                columns.add(result.getString(1));
            }
            return columns;
        }
    }

    private String foreignKeyDefinition(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conname='%s'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private boolean constraintValidated(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT convalidated FROM pg_constraint WHERE conname='%s'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }

    private String indexDefinition(Statement statement, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT indexdef FROM pg_indexes
                WHERE schemaname='public' AND indexname='%s'
                """.formatted(indexName))) {
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
