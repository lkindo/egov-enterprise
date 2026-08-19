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
@DisplayName("업무일지 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class DiaryBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 업무일지·일정 참조·첨부 FK를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.57")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_schdl_info (schdl_id, schdl_nm, frst_rgtr_id)
                    VALUES ('SCHDL_LEGACY_000001', '기존 일정', 'legacy-user')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_diary_info (
                        diary_id, schdl_id, diary_prgrs_rt, diary_nm, drctn_mttr, excptn_mttr,
                        frst_rgtr_id
                    ) VALUES (
                        'DIARY_LEGACY_000001', 'SCHDL_LEGACY_000001', 75, '기존 업무일지',
                        '보존할 지시사항', '보존할 특이사항', 'legacy-user'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            long scheduleSn;
            try (ResultSet schedule = statement.executeQuery("""
                    SELECT schdl_sn FROM tb_schdl_info WHERE schdl_nm = '기존 일정'
                    """)) {
                assertThat(schedule.next()).isTrue();
                scheduleSn = schedule.getLong("schdl_sn");
                assertThat(scheduleSn).isPositive();
            }
            try (ResultSet rows = statement.executeQuery("""
                    SELECT diary_sn, schdl_sn, diary_prgrs_rt, diary_nm, drctn_mttr, excptn_mttr,
                           frst_rgtr_id
                    FROM tb_diary_info WHERE diary_nm = '기존 업무일지'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("diary_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getLong("schdl_sn")).isEqualTo(scheduleSn);
                assertThat(rows.getInt("diary_prgrs_rt")).isEqualTo(75);
                assertThat(rows.getString("drctn_mttr")).isEqualTo("보존할 지시사항");
                assertThat(rows.getString("excptn_mttr")).isEqualTo("보존할 특이사항");
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_diary_info", "diary_id")).isFalse();
            assertThat(columnExists(statement, "tb_diary_info", "schdl_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_diary_info", "diary_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_diary_info", "diary_sn"))
                    .isEqualTo("public.sq_diary_sn");
            assertThat(primaryKeyColumn(statement, "tb_diary_info")).isEqualTo("diary_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_diary_info")).isEqualTo(1L);

            statement.executeUpdate("""
                    INSERT INTO tb_diary_info (diary_nm, diary_prgrs_rt)
                    VALUES ('신규 업무일지', 10)
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT diary_sn FROM tb_diary_info WHERE diary_nm = '신규 업무일지'
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
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND conrelid = '%s'::regclass
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
