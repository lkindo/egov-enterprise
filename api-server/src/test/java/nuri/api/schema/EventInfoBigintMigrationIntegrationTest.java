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
@DisplayName("행사 문자열 PK/외부인사 FK -> BIGINT IDENTITY/FK 마이그레이션")
class EventInfoBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 행사와 외부인사를 보존하고 숫자 관계로 재결속한다")
    void migratesLegacyEventAndExternalHrRelationship() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.79")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_event_info (
                        evnt_id, biz_yr, evnt_nm, evnt_cn, evnt_bgng_ymd,
                        evnt_end_ymd, evnt_use_cnt, pic_nm, evnt_aprv_yn
                    ) VALUES (
                        'EVT_LEGACY_000001', '2026', '기존 행사', '기존 행사 내용',
                        '20260814', '20260815', 120, '담당자', 'Y'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_extrl_hr_info (
                        evnt_id, otsd_hr_id, otsd_hr_nm, ogdp_inst_nm, eml_addr
                    ) VALUES (
                        'EVT_LEGACY_000001', 'HR_LEGACY_000001', '외부 전문가',
                        '한국인재개발원', 'expert@example.com'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long migratedSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT event.evnt_sn, event.evnt_nm, event.evnt_cn,
                           event.evnt_bgng_ymd, event.evnt_end_ymd,
                           external_hr.otsd_hr_id, external_hr.otsd_hr_nm,
                           external_hr.ogdp_inst_nm, external_hr.eml_addr
                    FROM tb_event_info event
                    JOIN tb_extrl_hr_info external_hr
                      ON external_hr.evnt_sn = event.evnt_sn
                    WHERE external_hr.otsd_hr_id = 'HR_LEGACY_000001'
                    """)) {
                assertThat(rows.next()).isTrue();
                migratedSn = rows.getLong("evnt_sn");
                assertThat(migratedSn).isPositive();
                assertThat(rows.getString("evnt_nm")).isEqualTo("기존 행사");
                assertThat(rows.getString("evnt_cn")).isEqualTo("기존 행사 내용");
                assertThat(rows.getString("evnt_bgng_ymd")).isEqualTo("20260814");
                assertThat(rows.getString("evnt_end_ymd")).isEqualTo("20260815");
                assertThat(rows.getString("otsd_hr_nm")).isEqualTo("외부 전문가");
                assertThat(rows.getString("ogdp_inst_nm")).isEqualTo("한국인재개발원");
                assertThat(rows.getString("eml_addr")).isEqualTo("expert@example.com");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_event_info", "evnt_id")).isFalse();
            assertThat(columnExists(statement, "tb_extrl_hr_info", "evnt_id")).isFalse();
            assertThat(columnDataType(statement, "tb_event_info", "evnt_sn")).isEqualTo("bigint");
            assertThat(columnDataType(statement, "tb_extrl_hr_info", "evnt_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_event_info", "evnt_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_event_info", "evnt_sn"))
                    .isEqualTo("public.sq_evnt_sn");
            assertThat(primaryKeyColumns(statement, "tb_event_info"))
                    .containsExactly("evnt_sn");
            assertThat(primaryKeyColumns(statement, "tb_extrl_hr_info"))
                    .containsExactly("evnt_sn", "otsd_hr_id");
            assertThat(foreignKeyIsValidated(statement, "fk_tb_extrl_hr_info_tb_event_info"))
                    .isTrue();
            assertThat(standardTermDomain(statement, "EVNT_SN")).isEqualTo("일련번호N19");

            long generatedSn;
            try (ResultSet generated = statement.executeQuery("""
                    INSERT INTO tb_event_info (biz_yr, evnt_nm, evnt_cn)
                    VALUES ('2027', '신규 행사', '신규 행사 내용')
                    RETURNING evnt_sn
                    """)) {
                assertThat(generated.next()).isTrue();
                generatedSn = generated.getLong(1);
            }
            assertThat(generatedSn).isGreaterThan(migratedSn);

            statement.executeUpdate("""
                    INSERT INTO tb_extrl_hr_info (evnt_sn, otsd_hr_id, otsd_hr_nm)
                    VALUES (%d, 'HR_NEW_000001', '신규 전문가')
                    """.formatted(generatedSn));
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
