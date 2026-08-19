package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("시스템 로그 요청 ID PK → BIGINT IDENTITY 내부 PK 마이그레이션")
class SysLogBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 요청 ID와 로그 필드를 보존하고 자동 내부키로 전환한다")
    void migratesExistingRowsAndPreservesRequestCorrelationId() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.73")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_sys_log
                        (dmnd_id, dmnd_user_id, dmnd_user_ip_addr, mthd_nm, srvc_nm,
                         prcs_se_cd, rspns_cd, err_se_cd, err_cd, prcs_tm, ocrn_ymd)
                    VALUES
                        ('REQ_LEGACY_001', 'legacy-user', '10.0.0.8', 'legacyMethod', 'LegacyService',
                         'R', '500', 'Y', 'E_SYS', 87, '20260814')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT sys_log_sn, dmnd_id, dmnd_user_id, dmnd_user_ip_addr, mthd_nm, srvc_nm,
                           prcs_se_cd, rspns_cd, err_se_cd, err_cd, prcs_tm, ocrn_ymd
                    FROM tb_sys_log
                    WHERE dmnd_id = 'REQ_LEGACY_001'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("sys_log_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("dmnd_user_id")).isEqualTo("legacy-user");
                assertThat(rows.getString("dmnd_user_ip_addr")).isEqualTo("10.0.0.8");
                assertThat(rows.getString("mthd_nm")).isEqualTo("legacyMethod");
                assertThat(rows.getString("srvc_nm")).isEqualTo("LegacyService");
                assertThat(rows.getString("prcs_se_cd")).isEqualTo("R");
                assertThat(rows.getString("rspns_cd")).isEqualTo("500");
                assertThat(rows.getString("err_se_cd")).isEqualTo("Y");
                assertThat(rows.getString("err_cd")).isEqualTo("E_SYS");
                assertThat(rows.getLong("prcs_tm")).isEqualTo(87L);
                assertThat(rows.getString("ocrn_ymd")).isEqualTo("20260814");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnDataType(statement, "tb_sys_log", "sys_log_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_sys_log", "sys_log_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_sys_log", "sys_log_sn"))
                    .isEqualTo("public.sq_sys_log_sn");
            assertThat(primaryKeyColumns(statement, "tb_sys_log")).containsExactly("sys_log_sn");
            assertThat(uniqueConstraintColumns(statement, "tb_sys_log", "uk_tb_sys_log_dmnd_id"))
                    .containsExactly("dmnd_id");

            statement.executeUpdate("""
                    INSERT INTO tb_sys_log (dmnd_id, srvc_nm, mthd_nm, ocrn_ymd)
                    VALUES ('REQ_NEW_001', 'NewService', 'newMethod', '20260814')
                    """);
            assertThat(singleLong(statement,
                    "SELECT sys_log_sn FROM tb_sys_log WHERE dmnd_id='REQ_NEW_001'"))
                    .isGreaterThan(migratedSn);
        }
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
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
        return constraintColumns(statement, tableName, "PRIMARY KEY", null);
    }

    private List<String> uniqueConstraintColumns(
            Statement statement, String tableName, String constraintName) throws SQLException {
        return constraintColumns(statement, tableName, "UNIQUE", constraintName);
    }

    private List<String> constraintColumns(
            Statement statement, String tableName, String constraintType, String constraintName) throws SQLException {
        String nameFilter = constraintName == null ? "" : " AND tc.constraint_name='" + constraintName + "'";
        try (ResultSet result = statement.executeQuery("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
                WHERE tc.table_schema='public' AND tc.table_name='%s' AND tc.constraint_type='%s'%s
                ORDER BY kcu.ordinal_position
                """.formatted(tableName, constraintType, nameFilter))) {
            var columns = new ArrayList<String>();
            while (result.next()) columns.add(result.getString(1));
            return columns;
        }
    }
}
