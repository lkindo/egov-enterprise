package nuri.migration.keymap;

import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.state.MigrationScratchIndex;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Locale;

/**
 * 레거시 키 → 신규 표준 대리키 대응 레지스트리 — 참조 무결성 보존의 핵심(키스톤).
 *
 * <p>부모 테이블에서 {@code idStrategy}로 신규 esntl_id 를 채번({@link #mintOrGet})하면 그 대응을
 * 암호화한 실행 전용 디스크 인덱스 + 타깃 테이블({@code tb_migration_key_map})에 적재한다. 자식 테이블은 {@code fkRef} 로
 * {@link #translate} 를 호출해 레거시 FK 값을 신규 부모 키로 재작성한다. 이것이 없으면 대리키 재생성 시
 * 모든 자식 FK 가 고아가 되며(그리고 stub 검증기가 이를 성공으로 보고), 그래서 이 도구의 최대 공백이었다.
 *
 * <p>실행 단위(run)마다 새로 생성한다(상태 누수 방지 — Spring 빈 아님). COMMIT 모드에서는 시작 시
 * {@link #preload} 로 기존 대응을 읽어 재실행 멱등성을 확보한다.
 */
public class KeyMapRegistry implements AutoCloseable {

    public static final String TABLE = MigrationSchemaManager.CONTROL_SCHEMA + ".tb_migration_key_map";
    private static final int KEY_COLUMN_LIMIT = 256;

    private final String runId;
    private final String sourceNamespace;

    private static final int PAGE_SIZE = 512;
    private final MigrationScratchIndex index = new MigrationScratchIndex(
            "CREATE TABLE scratch_keymap (source_table VARCHAR NOT NULL, legacy_key VARCHAR NOT NULL,"
                    + " new_key VARCHAR NOT NULL, pending_order BIGINT, PRIMARY KEY(source_table, legacy_key))",
            "CREATE INDEX scratch_pending ON scratch_keymap(pending_order)",
            "CREATE TABLE scratch_reservation_seen (legacy_key VARCHAR PRIMARY KEY)");
    private long nextPendingOrder;
    private boolean reservationActive;

    /** pending suffix의 시작점을 나타내는 rollback/accept 토큰. */
    public record Checkpoint(long pendingSize) {}

    private record PendingMapping(long order, String sourceTable, String legacyKey, String newKey) {}

    public KeyMapRegistry() {
        this("legacy", "legacy");
    }

    public KeyMapRegistry(String runId, String sourceNamespace) {
        if (runId == null || runId.isBlank() || sourceNamespace == null || sourceNamespace.isBlank()) {
            throw new IllegalArgumentException("keymap run/source namespace는 비어 있을 수 없습니다");
        }
        this.runId = runId;
        this.sourceNamespace = sourceNamespace;
    }

    /** 부모 PK 채번: 기존 대응이 있으면 재사용(멱등), 없으면 신규 생성·적재. legacyKey null 이면 null. */
    public String mintOrGet(String sourceTable, String legacyKey, String generatorPrefix) {
        if (legacyKey == null) {
            return null;
        }
        String existing = translate(sourceTable, legacyKey);
        if (existing != null) {
            return existing;
        }
        String newKey = StandardIdGenerator.generate(generatorPrefix);
        insertPending(sourceTable, legacyKey, newKey);
        return newKey;
    }

    /** typed/composite source→target identity를 기존 transaction pending 경계에 등록한다. */
    public TypedKeyTuple register(
            String sourceTable,
            TypedKeyTuple sourceKey,
            TypedKeyTuple targetKey
    ) {
        String encodedSource = TypedKeyEncoding.encode(
                sourceKey, KEY_COLUMN_LIMIT, "tb_migration_key_map.legacy_key");
        String encodedTarget = TypedKeyEncoding.encode(
                targetKey, KEY_COLUMN_LIMIT, "tb_migration_key_map.new_key");
        String existing = translate(sourceTable, encodedSource);
        if (existing != null) {
            if (!existing.equals(encodedTarget)) {
                throw new IllegalStateException("typed keymap conflict for " + sourceTable);
            }
            return TypedKeyEncoding.decode(existing);
        }
        insertPending(sourceTable, encodedSource, encodedTarget);
        return targetKey;
    }

    /**
     * 자식 FK 번역: 부모 테이블의 레거시 키 → 신규 키. 매핑 부재 시 {@code null}(고아). null 입력은 null 반환.
     */
    public String translate(String parentSourceTable, String legacyKey) {
        if (legacyKey == null) {
            return null;
        }
        return index.access(jdbc -> jdbc.query(
                "SELECT new_key FROM scratch_keymap WHERE source_table=? AND legacy_key=?",
                (rs, row) -> rs.getString(1), key(parentSourceTable), legacyKey).stream().findFirst().orElse(null));
    }

    /** typed/composite 자식 FK 번역. legacy 문자열 map으로 묵시 fallback하지 않는다. */
    public TypedKeyTuple translate(String parentSourceTable, TypedKeyTuple sourceKey) {
        String encodedSource = TypedKeyEncoding.encode(
                sourceKey, KEY_COLUMN_LIMIT, "tb_migration_key_map.legacy_key");
        String encodedTarget = translate(parentSourceTable, encodedSource);
        return encodedTarget == null ? null : TypedKeyEncoding.decode(encodedTarget);
    }

    public boolean hasMappingFor(String sourceTable) {
        return index.access(jdbc -> !jdbc.query(
                "SELECT 1 FROM scratch_keymap WHERE source_table=? FETCH FIRST 1 ROWS ONLY",
                (rs, row) -> rs.getInt(1), key(sourceTable)).isEmpty());
    }

    /** 기존 대응을 bounded page로 로컬 디스크에 읽어 재실행 시 동일 키를 재사용한다. */
    public void preload(JdbcTemplate target) {
        PendingMapping cursor = null;
        while (true) {
            String seek = cursor == null ? "" : " AND (source_table>? OR (source_table=? AND legacy_key>?))";
            Object[] args = cursor == null ? new Object[]{runId, sourceNamespace}
                    : new Object[]{runId, sourceNamespace, cursor.sourceTable(), cursor.sourceTable(), cursor.legacyKey()};
            List<PendingMapping> page = target.query("SELECT source_table, legacy_key, new_key FROM " + TABLE
                            + " WHERE run_id=? AND source_namespace=?" + seek
                            + " ORDER BY source_table, legacy_key FETCH FIRST " + PAGE_SIZE + " ROWS ONLY",
                    (rs, row) -> new PendingMapping(-1, rs.getString(1), rs.getString(2), rs.getString(3)), args);
            if (page.isEmpty()) return;
            index.access(jdbc -> jdbc.batchUpdate(
                    "MERGE INTO scratch_keymap (source_table, legacy_key, new_key, pending_order)"
                            + " KEY(source_table, legacy_key) VALUES (?, ?, ?, NULL)", page, PAGE_SIZE,
                    (statement, mapping) -> {
                        statement.setString(1, key(mapping.sourceTable()));
                        statement.setString(2, mapping.legacyKey());
                        statement.setString(3, mapping.newKey());
                    }));
            cursor = page.getLast();
        }
    }

    /** 현재 pending suffix를 구분할 checkpoint를 만든다. */
    public Checkpoint checkpoint() {
        return new Checkpoint(nextPendingOrder);
    }

    /**
     * checkpoint 이후 신규 keymap을 호출자가 관리하는 동일 target transaction에 기록한다.
     * commit/rollback은 호출자가 data INSERT와 함께 수행한다.
     */
    public long writePending(Connection connection, Checkpoint checkpoint) throws SQLException {
        long from = checkedOffset(checkpoint);
        long cursor = from - 1;
        long written = 0;
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO " + TABLE
                        + " (run_id, source_namespace, source_table, legacy_key, new_key) VALUES (?, ?, ?, ?, ?)")) {
            while (true) {
                long after = cursor;
                List<PendingMapping> page = index.access(jdbc -> jdbc.query(
                        "SELECT pending_order, source_table, legacy_key, new_key FROM scratch_keymap"
                                + " WHERE pending_order>=? AND pending_order>? ORDER BY pending_order"
                                + " FETCH FIRST " + PAGE_SIZE + " ROWS ONLY",
                        (rs, row) -> new PendingMapping(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4)),
                        from, after));
                if (page.isEmpty()) return written;
                for (PendingMapping mapping : page) {
                    statement.setString(1, runId);
                    statement.setString(2, sourceNamespace);
                    statement.setString(3, mapping.sourceTable());
                    statement.setString(4, mapping.legacyKey());
                    statement.setString(5, mapping.newKey());
                    statement.addBatch();
                }
                long batchWritten = exactInsertedRows(statement.executeBatch(), page.size());
                if (batchWritten < 0) {
                    throw new SQLException("키맵 JDBC batch updateCounts가 정확한 1행 기록을 증명하지 못했습니다");
                }
                written += batchWritten;
                statement.clearBatch();
                cursor = page.getLast().order();
            }
        }
    }

    /** transaction commit 성공 뒤 pending 표식만 제거하고 번역 identity는 디스크에 유지한다. */
    public void accept(Checkpoint checkpoint) {
        long from = checkedOffset(checkpoint);
        index.access(jdbc -> jdbc.update("UPDATE scratch_keymap SET pending_order=NULL WHERE pending_order>=?", from));
        nextPendingOrder = from;
    }

    /** transaction rollback 시 신규 pending과 그에 대응하는 번역을 함께 제거한다. */
    public void rollback(Checkpoint checkpoint) {
        long from = checkedOffset(checkpoint);
        index.access(jdbc -> jdbc.update("DELETE FROM scratch_keymap WHERE pending_order>=?", from));
        nextPendingOrder = from;
    }

    public boolean hasPending() {
        return index.access(jdbc -> !jdbc.query(
                "SELECT 1 FROM scratch_keymap WHERE pending_order IS NOT NULL FETCH FIRST 1 ROWS ONLY",
                (rs, row) -> rs.getInt(1)).isEmpty());
    }

    private long checkedOffset(Checkpoint checkpoint) {
        if (checkpoint == null || checkpoint.pendingSize() < 0 || checkpoint.pendingSize() > nextPendingOrder) {
            throw new IllegalStateException("유효하지 않은 keymap checkpoint: " + checkpoint);
        }
        return checkpoint.pendingSize();
    }

    private void insertPending(String sourceTable, String legacyKey, String newKey) {
        long following = Math.addExact(nextPendingOrder, 1);
        index.access(jdbc -> jdbc.update("INSERT INTO scratch_keymap VALUES (?, ?, ?, ?)",
                key(sourceTable), legacyKey, newKey, nextPendingOrder));
        nextPendingOrder = following;
    }

    @Override public void close() { index.close(); }

    /** Exact duplicate detection for one self-reference reservation pass, without retaining a heap set. */
    public ReservationKeys reservationKeys() {
        if (reservationActive) throw new IllegalStateException("a key reservation pass is already active");
        reservationActive = true;
        return new ReservationKeys();
    }

    public final class ReservationKeys implements AutoCloseable {
        private boolean closed;

        public boolean add(String legacyKey) {
            if (closed) throw new IllegalStateException("key reservation pass is closed");
            return index.access(jdbc -> jdbc.update("INSERT INTO scratch_reservation_seen (legacy_key)"
                    + " SELECT ? WHERE NOT EXISTS (SELECT 1 FROM scratch_reservation_seen WHERE legacy_key=?)",
                    legacyKey, legacyKey)) == 1;
        }

        @Override public void close() {
            if (closed) return;
            index.access(jdbc -> jdbc.update("DELETE FROM scratch_reservation_seen"));
            closed = true;
            reservationActive = false;
        }
    }

    private static long exactInsertedRows(int[] updateCounts, int expectedStatements) {
        if (updateCounts == null || updateCounts.length != expectedStatements) {
            return -1L;
        }
        long written = 0L;
        for (int count : updateCounts) {
            if (count == Statement.SUCCESS_NO_INFO || count == Statement.EXECUTE_FAILED || count != 1) {
                return -1L;
            }
            written += count;
        }
        return written;
    }

    private static String key(String sourceTable) {
        return sourceTable == null ? "" : sourceTable.toLowerCase(Locale.ROOT);
    }
}
