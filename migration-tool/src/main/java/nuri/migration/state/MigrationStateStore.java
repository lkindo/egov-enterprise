package nuri.migration.state;

import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.schema.MigrationSchemaManager;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** run/source 범위의 성공 행을 타깃 INSERT와 같은 transaction에 기록하는 durable checkpoint. */
public final class MigrationStateStore {

    public static final String RUN_TABLE = MigrationSchemaManager.CONTROL_SCHEMA + ".tb_migration_run";
    public static final String CHECKPOINT_TABLE = MigrationSchemaManager.CONTROL_SCHEMA
            + ".tb_migration_checkpoint";

    private final String runId;
    private final String sourceNamespace;
    private final Map<String, Map<String, CheckpointEntry>> checkpoints = new LinkedHashMap<>();

    public record CheckpointEntry(String sourceTable, String sourceKey, String targetTable,
                                  String targetKey, String rowChecksum) {
        private static final int KEY_COLUMN_LIMIT = 256;

        public static CheckpointEntry typed(
                String sourceTable,
                TypedKeyTuple sourceKey,
                String targetTable,
                TypedKeyTuple targetKey,
                String rowChecksum
        ) {
            return new CheckpointEntry(
                    sourceTable,
                    TypedKeyEncoding.encode(sourceKey, KEY_COLUMN_LIMIT,
                            "tb_migration_checkpoint.source_key"),
                    targetTable,
                    TypedKeyEncoding.encode(targetKey, KEY_COLUMN_LIMIT,
                            "tb_migration_checkpoint.target_key"),
                    rowChecksum);
        }
    }

    public MigrationStateStore(RunContext context) {
        if (context == null || blank(context.runId()) || blank(context.sourceNamespace())) {
            throw new IllegalArgumentException("commit 모드에는 run.runId와 run.sourceNamespace가 필수입니다");
        }
        this.runId = context.runId();
        this.sourceNamespace = context.sourceNamespace();
    }

    public void initialize(JdbcTemplate target) {
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
        preload(target);
    }

    private void preload(JdbcTemplate target) {
        checkpoints.clear();
        List<CheckpointEntry> loaded = target.query(
                "SELECT source_table, source_key, target_table, target_key, row_checksum FROM "
                        + CHECKPOINT_TABLE + " WHERE run_id=? AND source_namespace=?",
                (rs, rowNum) -> new CheckpointEntry(
                        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)),
                runId, sourceNamespace);
        loaded.forEach(this::accept);
    }

    public CheckpointEntry find(String sourceTable, String sourceKey) {
        Map<String, CheckpointEntry> table = checkpoints.get(normalize(sourceTable));
        return table == null ? null : table.get(sourceKey);
    }

    public long count(String sourceTable) {
        Map<String, CheckpointEntry> table = checkpoints.get(normalize(sourceTable));
        return table == null ? 0L : table.size();
    }

    public void write(Connection connection, List<CheckpointEntry> entries) throws SQLException {
        if (entries.isEmpty()) {
            return;
        }
        String sql = "INSERT INTO " + CHECKPOINT_TABLE
                + " (run_id, source_namespace, source_table, source_key, target_table, target_key, row_checksum)"
                + " VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (CheckpointEntry entry : entries) {
                statement.setString(1, runId);
                statement.setString(2, sourceNamespace);
                statement.setString(3, normalize(entry.sourceTable()));
                statement.setString(4, entry.sourceKey());
                statement.setString(5, normalize(entry.targetTable()));
                statement.setString(6, entry.targetKey());
                statement.setString(7, entry.rowChecksum());
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
        checkpoints.computeIfAbsent(normalize(entry.sourceTable()), ignored -> new LinkedHashMap<>())
                .put(entry.sourceKey(), entry);
    }

    public void mark(JdbcTemplate target, String status) {
        target.update("UPDATE " + RUN_TABLE
                + " SET run_stts_cd=?, last_mdfcn_dt=CURRENT_TIMESTAMP"
                + " WHERE run_id=? AND source_namespace=?", status, runId, sourceNamespace);
    }

    public static List<CheckpointEntry> read(JdbcTemplate target, RunContext context, String sourceTable) {
        if (context == null || blank(context.runId()) || blank(context.sourceNamespace())) {
            return List.of();
        }
        return target.query("SELECT source_table, source_key, target_table, target_key, row_checksum FROM "
                        + CHECKPOINT_TABLE
                        + " WHERE run_id=? AND source_namespace=? AND source_table=? ORDER BY source_key",
                (rs, rowNum) -> new CheckpointEntry(
                        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)),
                context.runId(), context.sourceNamespace(), normalize(sourceTable));
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
