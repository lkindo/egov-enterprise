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
@DisplayName("온라인 여론조사 관리·항목·결과 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class OnlinePollFamilyBigintMigrationIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("egovdb")
                    .withUsername("egov")
                    .withPassword("egov123");

    @Test
    @DisplayName("기존 투표 관계와 사용자별 유일성을 보존하고 세 기술 PK를 자동 숫자 키로 전환한다")
    void migratesExistingPollGraphAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.66")).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_onln_poll_manage (
                        poll_id, poll_nm, poll_bgng_ymd, poll_end_ymd, poll_knd_cd,
                        poll_dsuse_yn, poll_atmc_dsuse_yn, frst_rgtr_id
                    ) VALUES (
                        'POLL_LEGACY_0000001', '기존 여론조사', '20260801', '20260831', '001',
                        'N', 'N', 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_onln_poll_artcl (
                        poll_artcl_id, poll_id, poll_artcl_nm, frst_rgtr_id
                    ) VALUES (
                        'ITEM_LEGACY_0000001', 'POLL_LEGACY_0000001', '기존 선택지', 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_onln_poll_rslt (
                        poll_rslt_id, poll_id, poll_artcl_id, frst_rgtr_id
                    ) VALUES (
                        'RSLT_LEGACY_0000001', 'POLL_LEGACY_0000001', 'ITEM_LEGACY_0000001', 'voter'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = POSTGRES.createConnection("");
             Statement statement = connection.createStatement()) {
            long pollSn;
            long pollArtclSn;
            long pollRsltSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT p.poll_sn, a.poll_artcl_sn, r.poll_rslt_sn,
                           a.poll_sn AS article_poll_sn, r.poll_sn AS result_poll_sn,
                           r.poll_artcl_sn AS result_article_sn,
                           p.poll_nm, p.poll_bgng_ymd, p.poll_end_ymd, p.poll_knd_cd,
                           p.poll_dsuse_yn, p.poll_atmc_dsuse_yn,
                           a.poll_artcl_nm, r.frst_rgtr_id AS voter_id
                    FROM tb_onln_poll_manage p
                    JOIN tb_onln_poll_artcl a ON a.poll_sn = p.poll_sn
                    JOIN tb_onln_poll_rslt r ON r.poll_sn = p.poll_sn
                                                AND r.poll_artcl_sn = a.poll_artcl_sn
                    WHERE p.poll_nm = '기존 여론조사'
                    """)) {
                assertThat(rows.next()).isTrue();
                pollSn = rows.getLong("poll_sn");
                pollArtclSn = rows.getLong("poll_artcl_sn");
                pollRsltSn = rows.getLong("poll_rslt_sn");
                assertThat(pollSn).isPositive();
                assertThat(pollArtclSn).isPositive();
                assertThat(pollRsltSn).isPositive();
                assertThat(rows.getLong("article_poll_sn")).isEqualTo(pollSn);
                assertThat(rows.getLong("result_poll_sn")).isEqualTo(pollSn);
                assertThat(rows.getLong("result_article_sn")).isEqualTo(pollArtclSn);
                assertThat(rows.getString("poll_bgng_ymd")).isEqualTo("20260801");
                assertThat(rows.getString("poll_end_ymd")).isEqualTo("20260831");
                assertThat(rows.getString("poll_knd_cd")).isEqualTo("001");
                assertThat(rows.getString("poll_dsuse_yn")).isEqualTo("N");
                assertThat(rows.getString("poll_atmc_dsuse_yn")).isEqualTo("N");
                assertThat(rows.getString("poll_artcl_nm")).isEqualTo("기존 선택지");
                assertThat(rows.getString("voter_id")).isEqualTo("voter");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_onln_poll_manage", "poll_id")).isFalse();
            assertThat(columnExists(statement, "tb_onln_poll_artcl", "poll_artcl_id")).isFalse();
            assertThat(columnExists(statement, "tb_onln_poll_artcl", "poll_id")).isFalse();
            assertThat(columnExists(statement, "tb_onln_poll_rslt", "poll_rslt_id")).isFalse();
            assertThat(columnExists(statement, "tb_onln_poll_rslt", "poll_id")).isFalse();
            assertThat(columnExists(statement, "tb_onln_poll_rslt", "poll_artcl_id")).isFalse();

            assertIdentity(statement, "tb_onln_poll_manage", "poll_sn", "public.sq_poll_sn");
            assertIdentity(statement, "tb_onln_poll_artcl", "poll_artcl_sn", "public.sq_poll_artcl_sn");
            assertIdentity(statement, "tb_onln_poll_rslt", "poll_rslt_sn", "public.sq_poll_rslt_sn");
            assertThat(primaryKeyColumn(statement, "tb_onln_poll_manage")).isEqualTo("poll_sn");
            assertThat(primaryKeyColumn(statement, "tb_onln_poll_artcl")).isEqualTo("poll_artcl_sn");
            assertThat(primaryKeyColumn(statement, "tb_onln_poll_rslt")).isEqualTo("poll_rslt_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_onln_poll_manage")).isZero();
            assertThat(outboundForeignKeyCount(statement, "tb_onln_poll_artcl")).isEqualTo(1L);
            assertThat(outboundForeignKeyCount(statement, "tb_onln_poll_rslt")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_onln_poll_manage")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_onln_poll_artcl")).isEqualTo(1L);
            assertThat(inboundForeignKeyCount(statement, "tb_onln_poll_rslt")).isZero();
            assertThat(uniqueConstraintColumns(statement, "uk_tb_onln_poll_rslt_poll_voter"))
                    .isEqualTo("poll_sn,frst_rgtr_id");
            assertThat(indexExists(statement, "ix_tb_onln_poll_artcl_poll_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_onln_poll_rslt_poll_artcl_sn")).isTrue();

            long generatedPollSn = generatedKey(statement,
                    "INSERT INTO tb_onln_poll_manage (poll_nm) VALUES ('신규 여론조사') RETURNING poll_sn");
            long generatedArticleSn = generatedKey(statement, """
                    INSERT INTO tb_onln_poll_artcl (poll_sn, poll_artcl_nm)
                    VALUES (%d, '신규 선택지') RETURNING poll_artcl_sn
                    """.formatted(generatedPollSn));
            long generatedResultSn = generatedKey(statement, """
                    INSERT INTO tb_onln_poll_rslt (poll_sn, poll_artcl_sn, frst_rgtr_id)
                    VALUES (%d, %d, 'new-voter') RETURNING poll_rslt_sn
                    """.formatted(generatedPollSn, generatedArticleSn));
            assertThat(generatedPollSn).isGreaterThan(pollSn);
            assertThat(generatedArticleSn).isGreaterThan(pollArtclSn);
            assertThat(generatedResultSn).isGreaterThan(pollRsltSn);
        }
    }

    private Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration");
        if (target != null) configuration.target(target);
        return configuration.load();
    }

    private void assertIdentity(Statement statement, String tableName, String columnName, String sequenceName)
            throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s'
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo("BY DEFAULT");
        }
        try (ResultSet result = statement.executeQuery(
                "SELECT pg_get_serial_sequence('%s', '%s')".formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo(sequenceName);
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
        return foreignKeyCount(statement, "conrelid", tableName);
    }

    private long inboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        return foreignKeyCount(statement, "confrelid", tableName);
    }

    private long foreignKeyCount(Statement statement, String relationColumn, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND %s = '%s'::regclass
                """.formatted(relationColumn, tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private String uniqueConstraintColumns(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT string_agg(a.attname, ',' ORDER BY k.ord)
                FROM pg_constraint c
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                WHERE c.conname = '%s' AND c.contype = 'u'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private boolean indexExists(Statement statement, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public' AND indexname = '%s')
                """.formatted(indexName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private long generatedKey(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
