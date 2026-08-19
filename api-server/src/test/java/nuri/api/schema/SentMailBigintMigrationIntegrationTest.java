package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("이메일 발신 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class SentMailBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 발신 이력과 첨부 FK를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.63")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_email_dsptch_manage (
                        msg_id, eml_ttl, eml_cn, sndpty_nm, rcvr_nm,
                        dsptch_rslt_cd, dsptch_dt, frst_rgtr_id
                    ) VALUES (
                        'MAIL_LEGACY_000001', '기존 발신 제목', '보존할 발신 본문',
                        'sender@example.com', 'receiver@example.com', 'S',
                        TIMESTAMP '2026-08-14 09:30:00', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT eml_dsptch_sn, eml_ttl, eml_cn, sndpty_nm, rcvr_nm,
                           dsptch_rslt_cd, dsptch_dt, frst_rgtr_id
                    FROM tb_email_dsptch_manage WHERE eml_ttl = '기존 발신 제목'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("eml_dsptch_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("eml_cn")).isEqualTo("보존할 발신 본문");
                assertThat(rows.getString("sndpty_nm")).isEqualTo("sender@example.com");
                assertThat(rows.getString("rcvr_nm")).isEqualTo("receiver@example.com");
                assertThat(rows.getString("dsptch_rslt_cd")).isEqualTo("S");
                assertThat(rows.getTimestamp("dsptch_dt").toLocalDateTime())
                        .isEqualTo(java.time.LocalDateTime.of(2026, 8, 14, 9, 30));
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_email_dsptch_manage", "msg_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_email_dsptch_manage", "eml_dsptch_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_email_dsptch_manage", "eml_dsptch_sn"))
                    .isEqualTo("public.sq_eml_dsptch_sn");
            assertThat(primaryKeyColumn(statement, "tb_email_dsptch_manage"))
                    .isEqualTo("eml_dsptch_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_email_dsptch_manage")).isEqualTo(1L);
            assertThat(inboundForeignKeyCount(statement, "tb_email_dsptch_manage")).isZero();

            statement.executeUpdate("""
                    INSERT INTO tb_email_dsptch_manage (eml_ttl, dsptch_rslt_cd)
                    VALUES ('신규 발신 제목', 'P')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT eml_dsptch_sn FROM tb_email_dsptch_manage
                    WHERE eml_ttl = '신규 발신 제목'
                    """)) {
                assertThat(generated.next()).isTrue();
                assertThat(generated.getLong(1)).isGreaterThan(migratedSn);
            }
        }
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
        return foreignKeyCount(statement, "conrelid", tableName);
    }

    private long inboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        return foreignKeyCount(statement, "confrelid", tableName);
    }

    private long foreignKeyCount(Statement statement, String relationColumn, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND %s = '%s'::regclass
                """.formatted(relationColumn, tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
