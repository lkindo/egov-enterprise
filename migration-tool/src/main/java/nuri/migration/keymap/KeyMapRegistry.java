package nuri.migration.keymap;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
    /** 아직 타깃에 영속되지 않은 신규 대응 {sourceTable, legacyKey, newKey}. */
    private final List<String[]> pending = new ArrayList<>();

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
        pending.add(new String[]{key(sourceTable), legacyKey, newKey});
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

    /** 아직 미영속 대응을 타깃에 배치 적재(best-effort). preload 로 기존은 걸러졌으므로 PK 충돌 없음. */
    public int flushPending(JdbcTemplate target) {
        if (pending.isEmpty()) {
            return 0;
        }
        List<Object[]> args = new ArrayList<>(pending.size());
        for (String[] p : pending) {
            args.add(new Object[]{p[0], p[1], p[2]});
        }
        int[] r = target.batchUpdate(
                "INSERT INTO " + TABLE + " (source_table, legacy_key, new_key) VALUES (?, ?, ?)", args);
        pending.clear();
        return r.length;
    }

    private static String key(String sourceTable) {
        return sourceTable == null ? "" : sourceTable.toLowerCase();
    }
}
