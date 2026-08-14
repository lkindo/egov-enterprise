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

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@Testcontainers(disabledWithoutDocker = false)
@DisplayName("게시물 문자열 PK → BIGINT IDENTITY 폐포 마이그레이션")
class BoardPostBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 게시물·답글·댓글·만족도·스크랩·통계 관계를 숫자 FK로 보존한다")
    void migratesExistingBoardPostClosureAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.68")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (pst_id, bbs_id, up_pst_id, pst_ttl, use_yn)
                    VALUES ('900001', 'BBSMSTR_AAAAAAAAAAAA', '0', '기존 루트 글', 'Y'),
                           ('900002', 'BBSMSTR_AAAAAAAAAAAA', '900001', '기존 답글', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_comment (ans_sn, pst_id, bbs_id, ans_cn, use_yn)
                    VALUES (900001, '900002', 'BBSMSTR_AAAAAAAAAAAA', '기존 댓글', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_dgstfn_info (dgstfn_sn, pst_id, bbs_id, dgstfn_scr, use_yn)
                    VALUES (900001, '900002', 'BBSMSTR_AAAAAAAAAAAA', 5, 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_bbs_scrap (pst_id, bbs_id, scrap_nm, use_yn)
                    VALUES ('900002', 'BBSMSTR_AAAAAAAAAAAA', '기존 스크랩', 'Y')
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_dta_use_stats (pst_id, bbs_id, file_sn)
                    VALUES ('900002', 'BBSMSTR_AAAAAAAAAAAA', 1)
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long rootSn;
            long replySn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT pst_sn, up_pst_sn, pst_ttl
                    FROM tb_bbs_item
                    WHERE pst_ttl IN ('기존 루트 글', '기존 답글')
                    ORDER BY CASE pst_ttl WHEN '기존 루트 글' THEN 0 ELSE 1 END
                    """)) {
                assertThat(rows.next()).isTrue();
                rootSn = rows.getLong("pst_sn");
                assertThat(rows.getObject("up_pst_sn")).isNull();
                assertThat(rows.next()).isTrue();
                replySn = rows.getLong("pst_sn");
                assertThat(rows.getLong("up_pst_sn")).isEqualTo(rootSn);
                assertThat(rows.next()).isFalse();
            }

            assertThat(singleLong(statement,
                    "SELECT pst_sn FROM tb_bbs_comment WHERE ans_cn='기존 댓글'"))
                    .isEqualTo(replySn);
            assertThat(singleLong(statement,
                    "SELECT pst_sn FROM tb_dgstfn_info WHERE dgstfn_sn=900001"))
                    .isEqualTo(replySn);
            assertThat(singleLong(statement,
                    "SELECT pst_sn FROM tb_bbs_scrap WHERE scrap_nm='기존 스크랩'"))
                    .isEqualTo(replySn);
            assertThat(singleLong(statement,
                    "SELECT pst_sn FROM tb_dta_use_stats WHERE bbs_id='BBSMSTR_AAAAAAAAAAAA'"))
                    .isEqualTo(replySn);

            assertThat(columnExists(statement, "tb_bbs_item", "pst_id")).isFalse();
            assertThat(columnExists(statement, "tb_bbs_item", "up_pst_id")).isFalse();
            assertThat(columnExists(statement, "tb_bbs_comment", "pst_id")).isFalse();
            assertThat(columnExists(statement, "tb_bbs_scrap", "pst_id")).isFalse();
            assertThat(columnExists(statement, "tb_dgstfn_info", "pst_id")).isFalse();
            assertThat(columnExists(statement, "tb_dta_use_stats", "pst_id")).isFalse();
            assertThat(identityGeneration(statement, "tb_bbs_item", "pst_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_bbs_item", "pst_sn"))
                    .isEqualTo("public.sq_pst_sn");
            assertThat(primaryKeyColumn(statement, "tb_bbs_item")).isEqualTo("pst_sn");

            statement.executeUpdate("""
                    INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn)
                    VALUES ('BBSMSTR_AAAAAAAAAAAA', '신규 자동 채번 글', 'Y')
                    """);
            assertThat(singleLong(statement,
                    "SELECT pst_sn FROM tb_bbs_item WHERE pst_ttl='신규 자동 채번 글'"))
                    .isGreaterThan(replySn);
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

    private String primaryKeyColumn(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
                WHERE tc.table_schema='public' AND tc.table_name='%s' AND tc.constraint_type='PRIMARY KEY'
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
