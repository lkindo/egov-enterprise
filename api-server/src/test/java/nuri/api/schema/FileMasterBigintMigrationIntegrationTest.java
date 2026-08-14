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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@Testcontainers(disabledWithoutDocker = false)
@DisplayName("첨부파일 문자열 PK → BIGINT IDENTITY 폐포 마이그레이션")
class FileMasterBigintMigrationIntegrationTest {

    private static final List<String> REFERENCE_TABLES = List.of(
            "tb_file_detail",
            "tb_bbs_item",
            "tb_bnr_info",
            "tb_dept_task_info",
            "tb_diary_info",
            "tb_dta_use_stats",
            "tb_email_dsptch_manage",
            "tb_memo_rpt_info",
            "tb_note_info",
            "tb_rpt_info",
            "tb_rward_manage",
            "tb_schdl_info");

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 상세·업무 FK·팝업 URL을 숫자 키로 보존하고 신규 키를 자동 채번한다")
    void migratesExistingAttachmentClosureAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.71")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_file_master (atch_file_id, use_yn, frst_rgtr_id)
                    VALUES ('FILE_900001', 'Y', 'admin')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_file_detail
                        (atch_file_id, atch_file_seq, orgnl_file_nm, strg_file_nm, file_strg_path)
                    VALUES ('FILE_900001', 1, 'legacy.png', 'stored.png', 'general/FILE_900001')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, atch_file_id)
                    VALUES ('BBSMSTR_AAAAAAAAAAAA', '기존 첨부 게시물', 'Y', 'FILE_900001')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_popup_info (popup_ttl_nm, file_url)
                    VALUES ('기존 첨부 팝업', '/api/v1/files/download?fileId=FILE_900001')
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long attachmentSn = singleLong(statement,
                    "SELECT atch_file_sn FROM tb_file_master WHERE frst_rgtr_id='admin'");
            assertThat(singleLong(statement,
                    "SELECT atch_file_sn FROM tb_file_detail WHERE orgnl_file_nm='legacy.png'"))
                    .isEqualTo(attachmentSn);
            assertThat(singleLong(statement,
                    "SELECT atch_file_sn FROM tb_bbs_item WHERE pst_ttl='기존 첨부 게시물'"))
                    .isEqualTo(attachmentSn);
            assertThat(singleString(statement,
                    "SELECT file_url FROM tb_popup_info WHERE popup_ttl_nm='기존 첨부 팝업'"))
                    .isEqualTo("/api/v1/files/" + attachmentSn);

            assertThat(columnExists(statement, "tb_file_master", "atch_file_id")).isFalse();
            assertThat(columnExists(statement, "tb_file_master", "atch_file_sn")).isTrue();
            for (String table : REFERENCE_TABLES) {
                assertThat(columnExists(statement, table, "atch_file_id")).as(table).isFalse();
                assertThat(columnExists(statement, table, "atch_file_sn")).as(table).isTrue();
                assertThat(foreignKeyDefinition(statement, "fk_" + table + "_tb_file_master"))
                        .as(table)
                        .isEqualTo("FOREIGN KEY (atch_file_sn) REFERENCES tb_file_master(atch_file_sn)");
            }

            assertThat(identityGeneration(statement, "tb_file_master", "atch_file_sn"))
                    .isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_file_master", "atch_file_sn"))
                    .isEqualTo("public.sq_atch_file_sn");
            assertThat(primaryKeyColumns(statement, "tb_file_master"))
                    .containsExactly("atch_file_sn");
            assertThat(uniqueConstraintColumns(statement, "tb_file_detail", "uk_tb_file_detail_sn"))
                    .containsExactly("atch_file_sn", "atch_file_seq");

            statement.executeUpdate("INSERT INTO tb_file_master (use_yn) VALUES ('Y')");
            assertThat(singleLong(statement, "SELECT max(atch_file_sn) FROM tb_file_master"))
                    .isGreaterThan(attachmentSn);
        }
    }

    private Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration");
        if (target != null) configuration.target(target);
        return configuration.load();
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private String singleString(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s')
                """.formatted(tableName, columnName))) {
            result.next();
            return result.getBoolean(1);
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
            var columns = new java.util.ArrayList<String>();
            while (result.next()) columns.add(result.getString(1));
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
}
