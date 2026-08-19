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
@DisplayName("쪽지 본문·발송·수신 문자열 PK → BIGINT IDENTITY 데이터 마이그레이션")
class NoteFamilyBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 쪽지 관계와 첨부 FK를 보존하고 세 기술 PK를 자동 숫자 키로 전환한다")
    void migratesExistingNoteGraphAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.65")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_note_info (
                        note_id, note_ttl, note_cn, frst_rgtr_id
                    ) VALUES (
                        'NOTE_LEGACY_0000001', '기존 쪽지', '보존할 쪽지 내용', 'sender'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_note_sndng (
                        note_sndng_id, note_id, sndr_id, del_yn, frst_rgtr_id
                    ) VALUES (
                        'SEND_LEGACY_0000001', 'NOTE_LEGACY_0000001', 'sender', 'N', 'sender'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_note_rcptn (
                        note_rcptn_id, note_id, note_sndng_id, rcvr_id,
                        open_yn, rcptn_se_cd, del_yn, frst_rgtr_id
                    ) VALUES (
                        'RECV_LEGACY_0000001', 'NOTE_LEGACY_0000001', 'SEND_LEGACY_0000001',
                        'receiver', 'Y', '0', 'N', 'receiver'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long noteSn;
            long noteSndngSn;
            long noteRcptnSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT n.note_sn, s.note_sndng_sn, r.note_rcptn_sn,
                           s.note_sn AS sndng_note_sn, r.note_sn AS rcptn_note_sn,
                           r.note_sndng_sn AS rcptn_sndng_sn,
                           n.note_ttl, n.note_cn, s.sndr_id, s.del_yn AS sndng_del_yn,
                           r.rcvr_id, r.open_yn, r.rcptn_se_cd, r.del_yn AS rcptn_del_yn
                    FROM tb_note_info n
                    JOIN tb_note_sndng s ON s.note_sn = n.note_sn
                    JOIN tb_note_rcptn r ON r.note_sn = n.note_sn
                                             AND r.note_sndng_sn = s.note_sndng_sn
                    WHERE n.note_ttl = '기존 쪽지'
                    """)) {
                assertThat(rows.next()).isTrue();
                noteSn = rows.getLong("note_sn");
                noteSndngSn = rows.getLong("note_sndng_sn");
                noteRcptnSn = rows.getLong("note_rcptn_sn");
                assertThat(noteSn).isPositive();
                assertThat(noteSndngSn).isPositive();
                assertThat(noteRcptnSn).isPositive();
                assertThat(rows.getLong("sndng_note_sn")).isEqualTo(noteSn);
                assertThat(rows.getLong("rcptn_note_sn")).isEqualTo(noteSn);
                assertThat(rows.getLong("rcptn_sndng_sn")).isEqualTo(noteSndngSn);
                assertThat(rows.getString("note_cn")).isEqualTo("보존할 쪽지 내용");
                assertThat(rows.getString("sndr_id")).isEqualTo("sender");
                assertThat(rows.getString("sndng_del_yn")).isEqualTo("N");
                assertThat(rows.getString("rcvr_id")).isEqualTo("receiver");
                assertThat(rows.getString("open_yn")).isEqualTo("Y");
                assertThat(rows.getString("rcptn_se_cd")).isEqualTo("0");
                assertThat(rows.getString("rcptn_del_yn")).isEqualTo("N");
                assertThat(rows.next()).isFalse();
            }

            assertThat(columnExists(statement, "tb_note_info", "note_id")).isFalse();
            assertThat(columnExists(statement, "tb_note_sndng", "note_sndng_id")).isFalse();
            assertThat(columnExists(statement, "tb_note_sndng", "note_id")).isFalse();
            assertThat(columnExists(statement, "tb_note_rcptn", "note_rcptn_id")).isFalse();
            assertThat(columnExists(statement, "tb_note_rcptn", "note_id")).isFalse();
            assertThat(columnExists(statement, "tb_note_rcptn", "note_sndng_id")).isFalse();

            assertIdentity(statement, "tb_note_info", "note_sn", "public.sq_note_sn");
            assertIdentity(statement, "tb_note_sndng", "note_sndng_sn", "public.sq_note_sndng_sn");
            assertIdentity(statement, "tb_note_rcptn", "note_rcptn_sn", "public.sq_note_rcptn_sn");
            assertThat(primaryKeyColumn(statement, "tb_note_info")).isEqualTo("note_sn");
            assertThat(primaryKeyColumn(statement, "tb_note_sndng")).isEqualTo("note_sndng_sn");
            assertThat(primaryKeyColumn(statement, "tb_note_rcptn")).isEqualTo("note_rcptn_sn");
            assertThat(outboundForeignKeyCount(statement, "tb_note_info")).isEqualTo(1L);
            assertThat(outboundForeignKeyCount(statement, "tb_note_sndng")).isEqualTo(1L);
            assertThat(outboundForeignKeyCount(statement, "tb_note_rcptn")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_note_info")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_note_sndng")).isEqualTo(1L);
            assertThat(inboundForeignKeyCount(statement, "tb_note_rcptn")).isZero();
            assertThat(indexExists(statement, "ix_tb_note_sndng_note_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_note_rcptn_note_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_note_rcptn_note_sndng_sn")).isTrue();

            long generatedNoteSn = generatedKey(statement,
                    "INSERT INTO tb_note_info (note_ttl) VALUES ('신규 쪽지') RETURNING note_sn");
            long generatedSndngSn = generatedKey(statement, """
                    INSERT INTO tb_note_sndng (note_sn, sndr_id)
                    VALUES (%d, 'new-sender') RETURNING note_sndng_sn
                    """.formatted(generatedNoteSn));
            long generatedRcptnSn = generatedKey(statement, """
                    INSERT INTO tb_note_rcptn (note_sn, note_sndng_sn, rcvr_id)
                    VALUES (%d, %d, 'new-receiver') RETURNING note_rcptn_sn
                    """.formatted(generatedNoteSn, generatedSndngSn));
            assertThat(generatedNoteSn).isGreaterThan(noteSn);
            assertThat(generatedSndngSn).isGreaterThan(noteSndngSn);
            assertThat(generatedRcptnSn).isGreaterThan(noteRcptnSn);
        }
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
