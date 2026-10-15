package nuri.migration.state;

import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * run/source/매핑 범위의 성공 행을 타깃 INSERT와 같은 transaction에 기록하는 durable checkpoint.
 *
 * <p>[ADR-0029 L3c] checkpoint 는 매핑 단위다({@code mapping_id}). 한 소스를 둘로 나눈 매핑은 같은 소스 키를 따로
 * 기록하고 따로 재개한다. 기본 매핑(id 생략)의 {@code mapping_id} 는 빈 문자열이다 — 제어 스키마 V2 가 V1 의 기존 행을
 * 그 값으로 채웠으므로 분할하지 않은 run 은 그대로 이어서 재개된다.
 */
public final class MigrationStateStore {

    public static final String RUN_TABLE = MigrationSchemaManager.CONTROL_SCHEMA + ".tb_migration_run";
    public static final String CHECKPOINT_TABLE = MigrationSchemaManager.CONTROL_SCHEMA
            + ".tb_migration_checkpoint";

    private final String runId;
    private final String sourceNamespace;
    private final Map<Scope, Map<String, CheckpointEntry>> checkpoints = new LinkedHashMap<>();

    /** checkpoint 범위 — 소문자 소스 표기와 실효 매핑 id. */
    private record Scope(String sourceTable, String mappingId) {}

    public record CheckpointEntry(String sourceTable, String sourceKey, String targetTable,
                                  String targetKey, String rowChecksum, String mappingId) {
        private static final int KEY_COLUMN_LIMIT = 256;

        public CheckpointEntry {
            mappingId = mappingId == null ? TableMapping.DEFAULT_ID : mappingId;
        }

        /** 매핑 id 도입 전 생성자 호환 — 기본 매핑이다. */
        public CheckpointEntry(String sourceTable, String sourceKey, String targetTable,
                               String targetKey, String rowChecksum) {
            this(sourceTable, sourceKey, targetTable, targetKey, rowChecksum, TableMapping.DEFAULT_ID);
        }

        /** 매핑 id 도입 전 생성자 호환 — 기본 매핑이다. */
        public static CheckpointEntry typed(
                String sourceTable,
                TypedKeyTuple sourceKey,
                String targetTable,
                TypedKeyTuple targetKey,
                String rowChecksum
        ) {
            return typed(sourceTable, sourceKey, targetTable, targetKey, rowChecksum, TableMapping.DEFAULT_ID);
        }

        public static CheckpointEntry typed(
                String sourceTable,
                TypedKeyTuple sourceKey,
                String targetTable,
                TypedKeyTuple targetKey,
                String rowChecksum,
                String mappingId
        ) {
            return new CheckpointEntry(
                    sourceTable,
                    TypedKeyEncoding.encode(sourceKey, KEY_COLUMN_LIMIT,
                            "tb_migration_checkpoint.source_key"),
                    targetTable,
                    TypedKeyEncoding.encode(targetKey, KEY_COLUMN_LIMIT,
                            "tb_migration_checkpoint.target_key"),
                    rowChecksum,
                    mappingId);
        }
    }

    public MigrationStateStore(RunContext context) {
        if (context == null || blank(context.runId()) || blank(context.sourceNamespace())) {
            throw new IllegalArgumentException("commit 모드에는 run.runId와 run.sourceNamespace가 필수입니다");
        }
        this.runId = context.runId();
        this.sourceNamespace = context.sourceNamespace();
    }

    /** 재개 가드 없이 초기화한다 — 시험·검증 보조용. 적재는 {@link #initialize(JdbcTemplate, Collection)} 를 쓴다. */
    public void initialize(JdbcTemplate target) {
        initialize(target, null);
    }

    /**
     * 이 run 의 checkpoint 를 읽고 run 을 RUNNING 으로 둔다. {@code declared} 가 있으면 재개 가드를 먼저 본다 — 이 run 에
     * 기록된 (소스, 매핑 id) 가운데 mapping 에 같은 소스는 있는데 그 id 가 없거나, 그 id 의 매핑이 checkpoint 에 기록된 것과
     * 다른 대상 표에 쓰는 것이 있으면 run 상태를 바꾸지 않고 멈춘다. 매핑 id 를 바꾼 채 재개하면 새 id 의 매핑이 이미 적재한
     * 행을 다시 쓰기 때문이다 — 기본 매핑('')을 다른 대상의 매핑에 넘겨주는 개명도 같다. 소스가 mapping 에 아예 없으면 그
     * 표를 이번 실행에서 다루지 않는 것이므로 막지 않는다.
     */
    public void initialize(JdbcTemplate target, Collection<TableMapping> declared) {
        preload(target);
        if (declared != null) {
            requireKnownMappings(declared);
        }
        Integer existing = target.queryForObject("SELECT count(*) FROM " + RUN_TABLE
                + " WHERE run_id=? AND source_namespace=?", Integer.class, runId, sourceNamespace);
        if (existing == null || existing == 0) {
            target.update("INSERT INTO " + RUN_TABLE
                    + " (run_id, source_namespace, run_stts_cd) VALUES (?, ?, ?)",
                    runId, sourceNamespace, "RUNNING");
        } else {
            target.update("UPDATE " + RUN_TABLE
                    + " SET run_stts_cd=?, last_mdfcn_dt=CURRENT_TIMESTAMP"
                    + " WHERE run_id=? AND source_namespace=?", "RUNNING", runId, sourceNamespace);
        }
    }

    private void requireKnownMappings(Collection<TableMapping> declared) {
        // 소스 → (실효 매핑 id → 정규화한 대상 표)
        Map<String, Map<String, String>> targets = new HashMap<>();
        for (TableMapping table : declared) {
            if (table != null && table.source() != null) {
                targets.computeIfAbsent(normalize(table.source()), ignored -> new HashMap<>())
                        .put(table.effectiveId(), table.target() == null ? null : normalize(table.target()));
            }
        }
        Set<String> unknown = new TreeSet<>();
        Set<String> retargeted = new TreeSet<>();
        for (Map.Entry<Scope, Map<String, CheckpointEntry>> recorded : checkpoints.entrySet()) {
            Scope scope = recorded.getKey();
            Map<String, String> declaredIds = targets.get(scope.sourceTable());
            if (declaredIds == null) {
                continue;
            }
            if (!declaredIds.containsKey(scope.mappingId())) {
                unknown.add(label(scope));
                continue;
            }
            Set<String> recordedTargets = new HashSet<>();
            for (CheckpointEntry entry : recorded.getValue().values()) {
                recordedTargets.add(normalize(entry.targetTable()));
            }
            if (recordedTargets.size() != 1 || !recordedTargets.contains(declaredIds.get(scope.mappingId()))) {
                retargeted.add(label(scope));
            }
        }
        if (!unknown.isEmpty()) {
            throw new IllegalStateException("재개 가드: 이 run 의 checkpoint 에 있는 매핑 " + unknown
                    + " 이 mapping 에 없습니다 — 같은 소스의 매핑 id 를 바꾼 채 재개할 수 없습니다."
                    + " id 를 되돌리거나 새 runId 로 적재하십시오(MAPPING_ID_CHANGED)");
        }
        if (!retargeted.isEmpty()) {
            throw new IllegalStateException("재개 가드: 이 run 의 checkpoint 에 있는 매핑 " + retargeted
                    + " 이 mapping 에서 다른 대상 표에 씁니다 — 같은 소스의 매핑 id 를 바꾼 채 재개할 수 없습니다."
                    + " id 와 대상을 되돌리거나 새 runId 로 적재하십시오(MAPPING_ID_CHANGED)");
        }
    }

    private static String label(Scope scope) {
        return scope.mappingId().isEmpty() ? scope.sourceTable() + "(기본 매핑)"
                : scope.sourceTable() + "#" + scope.mappingId();
    }

    private void preload(JdbcTemplate target) {
        checkpoints.clear();
        List<CheckpointEntry> loaded = target.query(
                "SELECT source_table, source_key, target_table, target_key, row_checksum, mapping_id FROM "
                        + CHECKPOINT_TABLE + " WHERE run_id=? AND source_namespace=?",
                (rs, rowNum) -> new CheckpointEntry(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getString(5), rs.getString(6)),
                runId, sourceNamespace);
        loaded.forEach(this::accept);
    }

    public CheckpointEntry find(String sourceTable, String mappingId, String sourceKey) {
        Map<String, CheckpointEntry> table = checkpoints.get(scope(sourceTable, mappingId));
        return table == null ? null : table.get(sourceKey);
    }

    public long count(String sourceTable, String mappingId) {
        Map<String, CheckpointEntry> table = checkpoints.get(scope(sourceTable, mappingId));
        return table == null ? 0L : table.size();
    }

    public void write(Connection connection, List<CheckpointEntry> entries) throws SQLException {
        if (entries.isEmpty()) {
            return;
        }
        String sql = "INSERT INTO " + CHECKPOINT_TABLE
                + " (run_id, source_namespace, source_table, mapping_id, source_key, target_table, target_key,"
                + " row_checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (CheckpointEntry entry : entries) {
                statement.setString(1, runId);
                statement.setString(2, sourceNamespace);
                statement.setString(3, normalize(entry.sourceTable()));
                statement.setString(4, entry.mappingId());
                statement.setString(5, entry.sourceKey());
                statement.setString(6, normalize(entry.targetTable()));
                statement.setString(7, entry.targetKey());
                statement.setString(8, entry.rowChecksum());
                if (statement.executeUpdate() != 1) {
                    throw new SQLException("checkpoint INSERT 영향행이 1이 아닙니다");
                }
            }
        }
    }

    public void accept(List<CheckpointEntry> entries) {
        entries.forEach(this::accept);
    }

    private void accept(CheckpointEntry entry) {
        checkpoints.computeIfAbsent(scope(entry.sourceTable(), entry.mappingId()), ignored -> new LinkedHashMap<>())
                .put(entry.sourceKey(), entry);
    }

    public void mark(JdbcTemplate target, String status) {
        target.update("UPDATE " + RUN_TABLE
                + " SET run_stts_cd=?, last_mdfcn_dt=CURRENT_TIMESTAMP"
                + " WHERE run_id=? AND source_namespace=?", status, runId, sourceNamespace);
    }

    /** 기본 매핑의 checkpoint. 매핑 id 도입 전 호출부 호환. */
    public static List<CheckpointEntry> read(JdbcTemplate target, RunContext context, String sourceTable) {
        return read(target, context, sourceTable, TableMapping.DEFAULT_ID);
    }

    public static List<CheckpointEntry> read(JdbcTemplate target, RunContext context, String sourceTable,
                                             String mappingId) {
        if (context == null || blank(context.runId()) || blank(context.sourceNamespace())) {
            return List.of();
        }
        return target.query("SELECT source_table, source_key, target_table, target_key, row_checksum, mapping_id FROM "
                        + CHECKPOINT_TABLE
                        + " WHERE run_id=? AND source_namespace=? AND source_table=? AND mapping_id=?"
                        + " ORDER BY source_key",
                (rs, rowNum) -> new CheckpointEntry(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getString(5), rs.getString(6)),
                context.runId(), context.sourceNamespace(), normalize(sourceTable),
                mappingId == null ? TableMapping.DEFAULT_ID : mappingId);
    }

    private static Scope scope(String sourceTable, String mappingId) {
        return new Scope(normalize(sourceTable), mappingId == null ? TableMapping.DEFAULT_ID : mappingId);
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
