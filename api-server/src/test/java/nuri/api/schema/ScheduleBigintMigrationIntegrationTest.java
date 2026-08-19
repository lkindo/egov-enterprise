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
@DisplayName("일정 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class ScheduleBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 일정과 업무일지 논리 참조를 보존하고 자동 숫자 PK로 전환한다")
    void migratesExistingRowsAndLogicalDiaryReference() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.61")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_schdl_info (
                        schdl_id, schdl_se_cd, schdl_nm, schdl_cn,
                        schdl_bgng_ymd, schdl_end_ymd, schdl_pic_id, frst_rgtr_id
                    ) VALUES (
                        'SCHDL_LEGACY_000001', '2', '기존 일정', '보존할 일정 내용',
                        '20260814', '20260815', 'legacy-owner', 'legacy-user'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_diary_info (schdl_id, diary_prgrs_rt, diary_nm, frst_rgtr_id)
                    VALUES ('SCHDL_LEGACY_000001', 80, '일정 참조 업무일지', 'legacy-user')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT schdl_sn, schdl_se_cd, schdl_cn, schdl_bgng_ymd,
                           schdl_end_ymd, schdl_pic_id, frst_rgtr_id
                    FROM tb_schdl_info WHERE schdl_nm = '기존 일정'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("schdl_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("schdl_se_cd")).isEqualTo("2");
                assertThat(rows.getString("schdl_cn")).isEqualTo("보존할 일정 내용");
                assertThat(rows.getString("schdl_bgng_ymd")).isEqualTo("20260814");
                assertThat(rows.getString("schdl_end_ymd")).isEqualTo("20260815");
                assertThat(rows.getString("schdl_pic_id")).isEqualTo("legacy-owner");
                assertThat(rows.getString("frst_rgtr_id")).isEqualTo("legacy-user");
                assertThat(rows.next()).isFalse();
            }

            try (ResultSet diary = statement.executeQuery("""
                    SELECT schdl_sn, diary_prgrs_rt FROM tb_diary_info
                    WHERE diary_nm = '일정 참조 업무일지'
                    """)) {
                assertThat(diary.next()).isTrue();
                assertThat(diary.getLong("schdl_sn")).isEqualTo(migratedSn);
                assertThat(diary.getInt("diary_prgrs_rt")).isEqualTo(80);
                assertThat(diary.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_schdl_info", "schdl_id")).isFalse();
            assertThat(columnExists(statement, "tb_diary_info", "schdl_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_schdl_info", "schdl_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_schdl_info", "schdl_sn"))
                    .isEqualTo("public.sq_schdl_sn");
            assertThat(primaryKeyColumn(statement, "tb_schdl_info")).isEqualTo("schdl_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_schdl_info")).isEqualTo(1L);

            statement.executeUpdate("""
                    INSERT INTO tb_schdl_info (schdl_nm, schdl_pic_id)
                    VALUES ('신규 일정', 'new-owner')
                    """);
            try (ResultSet generated = statement.executeQuery("""
                    SELECT schdl_sn FROM tb_schdl_info WHERE schdl_nm = '신규 일정'
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
