package nuri.api.schema;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("주소록 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class AddressBookBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 주소록·회원 행을 보존하고 숫자 PK/FK와 자동 채번으로 전환한다")
    void migratesExistingRowsAndEnforcesGeneratedRelationship() throws SQLException {
        Flyway before = flyway(MigrationVersion.fromVersion("2.48"));
        before.migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_adbk_manage (adbk_id, adbk_nm, use_yn)
                    VALUES ('ADBK_LEGACY_0000001', '기존 주소록', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_adbk_info (adbk_constnt_id, adbk_id, nm)
                    VALUES ('ADBKUSER_LEGACY_01', 'ADBK_LEGACY_0000001', '기존 회원')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            try (ResultSet rows = statement.executeQuery("""
                    SELECT m.adbk_sn, i.adbk_mbr_sn, i.adbk_sn, m.adbk_nm, i.nm
                    FROM tb_adbk_manage m
                    JOIN tb_adbk_info i ON i.adbk_sn = m.adbk_sn
                    WHERE m.adbk_nm = '기존 주소록'
                    """)) {
                assertThat(rows.next()).isTrue();
                long addressBookSn = rows.getLong("adbk_sn");
                assertThat(addressBookSn).isPositive();
                assertThat(rows.getLong("adbk_mbr_sn")).isPositive();
                assertThat(rows.getLong(3)).isEqualTo(addressBookSn);
                assertThat(rows.getString("adbk_nm")).isEqualTo("기존 주소록");
                assertThat(rows.getString("nm")).isEqualTo("기존 회원");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_adbk_manage", "adbk_id")).isFalse();
            assertThat(columnExists(statement, "tb_adbk_info", "adbk_constnt_id")).isFalse();
            assertThat(columnExists(statement, "tb_adbk_info", "adbk_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_adbk_manage", "adbk_sn")).isEqualTo("BY DEFAULT");
            assertThat(identityGeneration(statement, "tb_adbk_info", "adbk_mbr_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_adbk_manage", "adbk_sn")).isEqualTo("public.sq_adbk_sn");
            assertThat(serialSequence(statement, "tb_adbk_info", "adbk_mbr_sn")).isEqualTo("public.sq_adbk_mbr_sn");

            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_adbk_info (adbk_sn, nm)
                    VALUES (9223372036854775807, '고아 회원')
                    """))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_adbk_info_tb_adbk_manage");
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
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
                SELECT identity_generation
                FROM information_schema.columns
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
}
