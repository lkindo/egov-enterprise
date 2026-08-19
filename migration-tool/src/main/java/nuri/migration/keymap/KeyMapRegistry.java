package nuri.migration.keymap;

import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 레거시 키 → 신규 표준 대리키 대응 레지스트리 — 참조 무결성 보존의 핵심(키스톤).
 *
 * <p>부모 테이블에서 {@code idStrategy}로 신규 esntl_id 를 채번({@link #mintOrGet})하면 그 대응을
 * 인메모리 + 타깃 테이블({@code tb_migration_key_map})에 적재한다. 자식 테이블은 {@code fkRef} 로
 * {@link #translate} 를 호출해 레거시 FK 값을 신규 부모 키로 재작성한다. 이것이 없으면 대리키 재생성 시
 * 모든 자식 FK 가 고아가 되며(그리고 stub 검증기가 이를 성공으로 보고), 그래서 이 도구의 최대 공백이었다.
 *
 * <p>실행 단위(run)마다 새로 생성한다(상태 누수 방지 — Spring 빈 아님). COMMIT 모드에서는 시작 시
 * {@link #preload} 로 기존 대응을 읽어 재실행 멱등성을 확보한다.
 */
public class KeyMapRegistry {

    public static final String TABLE = "tb_migration_key_map";

    /** sourceTable(lower) → (legacyKey → newKey). */
    private final Map<String, Map<String, String>> maps = new LinkedHashMap<>();
    /** 아직 현재 target transaction에 동반 기록되지 않은 신규 대응. */
    private final List<PendingMapping> pending = new ArrayList<>();

    /** pending suffix의 시작점을 나타내는 rollback/accept 토큰. */
    public record Checkpoint(int pendingSize) {}

    private record PendingMapping(String sourceTable, String legacyKey, String newKey) {}

    /** 부모 PK 채번: 기존 대응이 있으면 재사용(멱등), 없으면 신규 생성·적재. legacyKey null 이면 null. */
    public String mintOrGet(String sourceTable, String legacyKey, String generatorPrefix) {
        if (legacyKey == null) {
            return null;
        }
        Map<String, String> m = maps.computeIfAbsent(key(sourceTable), k -> new LinkedHashMap<>());
        String existing = m.get(legacyKey);
        if (existing != null) {
            return existing;
        }
        String newKey = StandardIdGenerator.generate(generatorPrefix);
        m.put(legacyKey, newKey);
        pending.add(new PendingMapping(key(sourceTable), legacyKey, newKey));
        return newKey;
    }

    /**
     * 자식 FK 번역: 부모 테이블의 레거시 키 → 신규 키. 매핑 부재 시 {@code null}(고아). null 입력은 null 반환.
     */
    public String translate(String parentSourceTable, String legacyKey) {
        if (legacyKey == null) {
            return null;
        }
        Map<String, String> m = maps.get(key(parentSourceTable));
        return m == null ? null : m.get(legacyKey);
    }

    public boolean hasMappingFor(String sourceTable) {
        Map<String, String> m = maps.get(key(sourceTable));
        return m != null && !m.isEmpty();
    }

    /** 타깃에 키맵 테이블을 멱등 생성(H2·PostgreSQL 공통 DDL). */
    public void ensureTable(JdbcTemplate target) {
        target.execute("CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                + "source_table varchar(128) NOT NULL, "
                + "legacy_key varchar(256) NOT NULL, "
                + "new_key varchar(256) NOT NULL, "
                + "CONSTRAINT pk_" + TABLE + " PRIMARY KEY (source_table, legacy_key))");
    }

    /** 기존 대응을 인메모리로 선적재 — 재실행 시 동일 키 재사용(멱등). */
    public void preload(JdbcTemplate target) {
        target.query("SELECT source_table, legacy_key, new_key FROM " + TABLE, rs -> {
            maps.computeIfAbsent(rs.getString(1), k -> new LinkedHashMap<>())
                    .put(rs.getString(2), rs.getString(3));
        });
    }

    /** 현재 pending suffix를 구분할 checkpoint를 만든다. */
    public Checkpoint checkpoint() {
        return new Checkpoint(pending.size());
    }

    /**
     * checkpoint 이후 신규 keymap을 호출자가 관리하는 동일 target transaction에 기록한다.
     * commit/rollback은 호출자가 data INSERT와 함께 수행한다.
     */
    public long writePending(Connection connection, Checkpoint checkpoint) throws SQLException {
        int from = checkedOffset(checkpoint);
        int expected = pending.size() - from;
        if (expected == 0) {
            return 0L;
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO " + TABLE + " (source_table, legacy_key, new_key) VALUES (?, ?, ?)")) {
            for (int i = from; i < pending.size(); i++) {
                PendingMapping mapping = pending.get(i);
                statement.setString(1, mapping.sourceTable());
                statement.setString(2, mapping.legacyKey());
                statement.setString(3, mapping.newKey());
                statement.addBatch();
            }
            int[] updateCounts = statement.executeBatch();
            long written = exactInsertedRows(updateCounts, expected);
            if (written < 0) {
                throw new SQLException("키맵 JDBC batch updateCounts가 정확한 1행 기록을 증명하지 못했습니다");
            }
            return written;
        }
    }

    /** transaction commit 성공 뒤 pending 표식만 제거하고 인메모리 번역 map은 유지한다. */
    public void accept(Checkpoint checkpoint) {
        int from = checkedOffset(checkpoint);
        pending.subList(from, pending.size()).clear();
    }

    /** transaction rollback 시 신규 pending과 그에 대응하는 인메모리 번역을 함께 제거한다. */
    public void rollback(Checkpoint checkpoint) {
        int from = checkedOffset(checkpoint);
        for (int i = pending.size() - 1; i >= from; i--) {
            PendingMapping mapping = pending.get(i);
            Map<String, String> tableMappings = maps.get(mapping.sourceTable());
            if (tableMappings != null) {
                tableMappings.remove(mapping.legacyKey(), mapping.newKey());
                if (tableMappings.isEmpty()) {
                    maps.remove(mapping.sourceTable());
                }
            }
        }
        pending.subList(from, pending.size()).clear();
    }

    public boolean hasPending() {
        return !pending.isEmpty();
    }

    private int checkedOffset(Checkpoint checkpoint) {
        if (checkpoint == null || checkpoint.pendingSize() < 0 || checkpoint.pendingSize() > pending.size()) {
            throw new IllegalStateException("유효하지 않은 keymap checkpoint: " + checkpoint);
        }
        return checkpoint.pendingSize();
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
