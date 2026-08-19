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
@DisplayName("개인정보 로그 요청 ID PK → BIGINT IDENTITY 내부키 마이그레이션")
class PrivacyLogBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 로그를 보존하고 요청 ID는 UNIQUE 업무키로 유지한다")
    void migratesLegacyRowsAndPreservesRequestId() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.78")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_privacy_log (
                        dmnd_id, inq_dt, srvc_nm, inq_info, dmnd_user_id, dmnd_user_ip_addr
                    ) VALUES (
                        'PRVC_REQ_LEGACY_001', TIMESTAMP '2026-08-14 12:00:00',
                        'UserLookupService', '사용자 상세 조회', 'ADMIN01', '127.0.0.1'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT prvc_log_sn, dmnd_id, inq_dt, srvc_nm, inq_info,
                           dmnd_user_id, dmnd_user_ip_addr
                    FROM tb_privacy_log WHERE dmnd_id = 'PRVC_REQ_LEGACY_001'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("prvc_log_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("srvc_nm")).isEqualTo("UserLookupService");
                assertThat(rows.getString("inq_info")).isEqualTo("사용자 상세 조회");
                assertThat(rows.getString("dmnd_user_id")).isEqualTo("ADMIN01");
                assertThat(rows.getString("dmnd_user_ip_addr")).isEqualTo("127.0.0.1");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnDataType(statement, "tb_privacy_log", "prvc_log_sn"))
                    .isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_privacy_log", "prvc_log_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_privacy_log", "prvc_log_sn"))
                    .isEqualTo("public.sq_prvc_log_sn");
            assertThat(primaryKeyColumn(statement, "tb_privacy_log")).isEqualTo("prvc_log_sn");
            assertThat(uniqueConstraintExists(statement, "uk_tb_privacy_log_dmnd_id", "dmnd_id"))
                    .isTrue();
            assertThat(standardTermDomain(statement, "PRVC_LOG_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_privacy_log (dmnd_id, srvc_nm, inq_info)
                    VALUES ('PRVC_REQ_NEW_001', 'UserLookupService', '신규 사용자 조회')
                    RETURNING prvc_log_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);
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

    private boolean uniqueConstraintExists(
            Statement statement, String constraintName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN unnest(c.conkey) AS k(attnum) ON true
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                    WHERE t.relname='tb_privacy_log' AND c.conname='%s'
                      AND c.contype='u' AND a.attname='%s'
                )
                """.formatted(constraintName, columnName))) {
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
