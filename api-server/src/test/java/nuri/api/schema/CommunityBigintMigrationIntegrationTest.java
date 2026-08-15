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
@DisplayName("커뮤니티 문자열 PK → BIGINT IDENTITY 폐포 마이그레이션")
class CommunityBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 커뮤니티·멤버십·게시판 참조를 숫자 키로 보존한다")
    void migratesExistingCommunityClosureAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.70")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_cmnty_info
                        (cmnty_id, cmnty_nm, cmnty_intro_cn, reg_se_cd, use_yn)
                    VALUES ('CMNTY_900001', '기존 커뮤니티', '기존 커뮤니티 소개', 'REGC01', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_cmnty_user_map
                        (cmnty_id, user_id, mngr_yn, use_yn, mbr_stts_cd)
                    VALUES ('CMNTY_900001', 'USRCNFRM_00000000001', 'Y', 'Y', 'A')
                    """);
            assertThat(statement.executeUpdate("""
                    UPDATE tb_bbs_master
                    SET cmnty_id = 'CMNTY_900001'
                    WHERE bbs_id = 'BBSMSTR_AAAAAAAAAAAA'
                    """)).isEqualTo(1);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long cmntySn = singleLong(statement,
                    "SELECT cmnty_sn FROM tb_cmnty_info WHERE cmnty_nm='기존 커뮤니티'");
            assertThat(singleLong(statement,
                    "SELECT cmnty_sn FROM tb_cmnty_user_map WHERE user_id='USRCNFRM_00000000001'"))
                    .isEqualTo(cmntySn);
            assertThat(singleLong(statement,
                    "SELECT cmnty_sn FROM tb_bbs_master WHERE bbs_id='BBSMSTR_AAAAAAAAAAAA'"))
                    .isEqualTo(cmntySn);

            for (String table : List.of("tb_cmnty_info", "tb_cmnty_user_map", "tb_bbs_master")) {
                assertThat(columnExists(statement, table, "cmnty_id")).isFalse();
                assertThat(columnExists(statement, table, "cmnty_sn")).isTrue();
            }
            assertThat(identityGeneration(statement, "tb_cmnty_info", "cmnty_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_cmnty_info", "cmnty_sn")).isEqualTo("public.sq_cmnty_sn");
            assertThat(primaryKeyColumns(statement, "tb_cmnty_info")).containsExactly("cmnty_sn");
            assertThat(primaryKeyColumns(statement, "tb_cmnty_user_map"))
                    .containsExactly("cmnty_sn", "user_id");
            assertThat(foreignKeyDefinition(statement, "fk_tb_cmnty_user_map_tb_cmnty_info"))
                    .isEqualTo("FOREIGN KEY (cmnty_sn) REFERENCES tb_cmnty_info(cmnty_sn)");

            statement.executeUpdate("""
                    INSERT INTO tb_cmnty_info (cmnty_nm, cmnty_intro_cn, reg_se_cd, use_yn)
                    VALUES ('신규 자동 채번 커뮤니티', '신규 소개', 'REGC01', 'Y')
                    """);
            assertThat(singleLong(statement,
                    "SELECT cmnty_sn FROM tb_cmnty_info WHERE cmnty_nm='신규 자동 채번 커뮤니티'"))
                    .isGreaterThan(cmntySn);
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
        try (ResultSet result = statement.executeQuery("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
                WHERE tc.table_schema='public' AND tc.table_name='%s' AND tc.constraint_type='PRIMARY KEY'
                ORDER BY kcu.ordinal_position
                """.formatted(tableName))) {
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
