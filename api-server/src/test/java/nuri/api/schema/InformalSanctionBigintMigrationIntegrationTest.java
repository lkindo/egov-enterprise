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
@DisplayName("비공식 결재 문자열 PK/논리참조 → BIGINT IDENTITY/FK 마이그레이션")
class InformalSanctionBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 결재와 포상 논리참조를 보존하고 숫자 FK로 재결속한다")
    void migratesLegacySanctionAndRewardReference() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.77")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_info (
                        ifml_atrz_id, task_se_cd, aplcnt_id, req_ymd, aprvr_id, aprv_yn
                    ) VALUES (
                        'INFRML_LEGACY_00001', 'TASK01', 'APPLICANT', '20260814', 'APPROVER', 'A'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_rward_manage (
                        rwrd_user_id, rwrd_cd, rwrd_nm, ifml_atrz_id
                    ) VALUES (
                        'APPLICANT', 'R001', '기존 포상', 'INFRML_LEGACY_00001'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT sanction.ifml_atrz_sn, sanction.task_se_cd, sanction.aplcnt_id,
                           sanction.aprvr_id, sanction.aprv_yn, reward.rwrd_nm
                    FROM tb_ifml_atrz_info sanction
                    JOIN tb_rward_manage reward
                      ON reward.ifml_atrz_sn = sanction.ifml_atrz_sn
                    WHERE reward.rwrd_nm = '기존 포상'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("ifml_atrz_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("task_se_cd")).isEqualTo("TASK01");
                assertThat(rows.getString("aplcnt_id")).isEqualTo("APPLICANT");
                assertThat(rows.getString("aprvr_id")).isEqualTo("APPROVER");
                assertThat(rows.getString("aprv_yn")).isEqualTo("A");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_ifml_atrz_info", "ifml_atrz_id")).isFalse();
            assertThat(columnExists(statement, "tb_rward_manage", "ifml_atrz_id")).isFalse();
            assertThat(columnDataType(statement, "tb_ifml_atrz_info", "ifml_atrz_sn"))
                    .isEqualTo("bigint");
            assertThat(columnDataType(statement, "tb_rward_manage", "ifml_atrz_sn"))
                    .isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_ifml_atrz_info", "ifml_atrz_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_ifml_atrz_info", "ifml_atrz_sn"))
                    .isEqualTo("public.sq_ifml_atrz_sn");
            assertThat(primaryKeyColumn(statement, "tb_ifml_atrz_info")).isEqualTo("ifml_atrz_sn");
            assertThat(foreignKeyIsValidated(statement, "fk_tb_rward_manage_tb_ifml_atrz_info"))
                    .isTrue();
            assertThat(standardTermDomain(statement, "IFML_ATRZ_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_ifml_atrz_info (
                        task_se_cd, aplcnt_id, req_ymd, aprvr_id, aprv_yn
                    ) VALUES (
                        'TASK02', 'NEW_APPLICANT', '20260815', 'NEW_APPROVER', 'A'
                    )
                    RETURNING ifml_atrz_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);
        }
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

    private boolean foreignKeyIsValidated(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT convalidated FROM pg_constraint WHERE conname='%s'
                """.formatted(constraintName))) {
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
