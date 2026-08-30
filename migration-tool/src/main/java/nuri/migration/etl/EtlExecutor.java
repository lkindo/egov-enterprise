package nuri.migration.etl;

import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.keymap.KeyMapRegistry.Checkpoint;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.MigrationStateStore;
import nuri.migration.state.MigrationStateStore.CheckpointEntry;
import nuri.migration.state.RowChecksum;
import nuri.migration.transform.CodeMapper;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * ETL 실행기 — FK 위상정렬 → 스트리밍(keyset-fetch) 소스 조회 → 컬럼 매핑/코드맵/변환/타입강제/키맵 재작성 →
 * 배치·트랜잭션 타깃 적재.
 *
 * <p>재설계(2026-07-23): 기존 SKELETON(전량 메모리 로드 · 행단위 autocommit · 死 type/idStrategy · 무순서)을
 * 다음으로 대체했다 — (1) {@link TableOrderer} 위상정렬로 부모 먼저, (2) 복합키 keyset page로 메모리 상한,
 * (3) {@link TypeConverter}로 {@code type} 활성화, (4) {@link KeyMapRegistry}로 {@code idStrategy} 채번 +
 * {@code fkRef} FK 번역(참조 무결성), (5) JDBC 배치 + 청크 트랜잭션(배치 실패 시 행단위 폴백으로 오류 격리).
 *
 * <p>남은 로드맵: PG COPY 고속경로, dead-letter 격리 테이블(현재 오류 리스트),
 * commit 결과 불확정 reconciliation — 설계문서 §7 참조.
 */
@Component
public class EtlExecutor {

    /** 스트리밍 fetch/배치 청크 크기. */
    private static final int CHUNK = 500;

    private final SourceIntrospector introspector;
    private final TransformerRegistry transformers;

    public EtlExecutor(SourceIntrospector introspector, TransformerRegistry transformers) {
        this.introspector = introspector;
        this.transformers = transformers;
    }

    public record TableResult(String sourceTable, String targetTable,
                              long read, long transformed, long written, List<String> errors) {}

    public List<TableResult> execute(MappingSpec spec, MigrationMode mode) {
        if (spec.source() == null) {
            throw new IllegalArgumentException("mapping.source 접속 설정이 없습니다.");
        }
        if (mode == MigrationMode.COMMIT && spec.target() == null) {
            throw new IllegalArgumentException("commit 모드에는 mapping.target 접속 설정이 필수입니다.");
        }
        boolean commit = mode == MigrationMode.COMMIT;
        if (commit) {
            requireCommitContract(spec);
        }
        JdbcTemplate sourceJt = introspector.jdbc(spec.source());
        DataSource sourceDs = sourceJt.getDataSource();
        JdbcTemplate targetJt = spec.target() == null ? null : introspector.jdbc(spec.target());
        DataSource targetDs = targetJt == null ? null : targetJt.getDataSource();
        RunContext run = spec.run();
        KeyMapRegistry registry = commit
                ? new KeyMapRegistry(run.runId(), run.sourceNamespace())
                : new KeyMapRegistry();
        MigrationStateStore state = commit ? new MigrationStateStore(run) : null;
        if (commit) {
            new MigrationSchemaManager().migrateAndValidate(targetJt);
            registry.preload(targetJt); // 재실행 멱등: 기존 대응 재사용
            state.initialize(targetJt);
        }

        List<TableResult> results = new ArrayList<>();
        try {
            for (TableMapping t : TableOrderer.order(spec.tables())) {
                results.add(runTable(sourceDs, targetDs, spec, t, registry, state, commit));
            }
        } catch (RuntimeException e) {
            if (state != null) {
                state.mark(targetJt, "FAILED");
            }
            throw e;
        }
        if (registry.hasPending()) {
            throw new IllegalStateException("처리 종료 후 미확정 keymap이 남았습니다 — 이관 결과를 신뢰할 수 없습니다");
        }
        if (state != null) {
            boolean failed = results.stream().anyMatch(result -> !result.errors().isEmpty());
            state.mark(targetJt, failed ? "FAILED" : "LOADED");
        }
        return results;
    }

    private static void requireCommitContract(MappingSpec spec) {
        RunContext run = spec.run();
        if (run == null || isBlank(run.runId()) || isBlank(run.sourceNamespace())) {
            throw new IllegalArgumentException(
                    "commit 모드에는 run.runId와 run.sourceNamespace가 필수입니다");
        }
        for (TableMapping table : spec.tables()) {
            if (!isBlank(table.orderBy()) && !table.orderByKeys().isEmpty()) {
                throw new IllegalArgumentException(table.source()
                        + ": orderBy와 orderByKeys를 함께 선언할 수 없습니다");
            }
            List<String> orderKeys = table.effectiveOrderKeys();
            if (orderKeys.isEmpty()) {
                throw new IllegalArgumentException(table.source()
                        + ": commit 모드에는 명시적 orderBy/orderByKeys source key가 필수입니다");
            }
            Set<String> distinct = new HashSet<>();
            for (String orderKey : orderKeys) {
                SourceIntrospector.ident(orderKey);
                if (!distinct.add(orderKey.toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException(table.source()
                            + ": orderByKeys 중복 금지: " + orderKey);
                }
            }
            String targetIdentity = targetIdentityColumn(table);
            if (isBlank(targetIdentity)) {
                throw new IllegalArgumentException(table.source()
                        + ": checkpoint/verifier용 targetKey 또는 idStrategy.column이 필수입니다");
            }
            SourceIntrospector.ident(targetIdentity);
        }
    }

    private TableResult runTable(DataSource sourceDs, DataSource targetDs, MappingSpec spec,
                                 TableMapping t, KeyMapRegistry reg, MigrationStateStore state,
                                 boolean commit) {
        List<String> errors = new ArrayList<>();
        List<String> targetCols = canonicalTargetColumns(t);
        String insertSql = buildInsertSql(t.target(), targetCols);
        long[] c = {0, 0, 0}; // read, transformed, written

        Connection targetConn = null;
        try {
            if (commit) {
                targetConn = targetDs.getConnection();
                targetConn.setReadOnly(false);
                targetConn.setAutoCommit(false);
            }
            try (Connection sc = sourceDs.getConnection()) {
                sc.setReadOnly(true);
                sc.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
                sc.setAutoCommit(false); // 모든 keyset page가 같은 source snapshot을 보도록 고정
                preMintSelfReferences(sc, targetConn, t, reg);
                if (t.effectiveOrderKeys().isEmpty()) {
                    streamUnorderedDryRun(sc, spec, t, targetCols, insertSql, reg, state,
                            targetConn, c, errors);
                } else {
                    readKeysetPages(sc, spec, t, targetCols, insertSql, reg, state,
                            targetConn, c, errors);
                }
                sc.commit();
            }
        } catch (SQLException e) {
            errors.add("이관 실패(" + t.source() + "): " + e.getMessage());
            safeRollback(targetConn);
        } finally {
            safeClose(targetConn);
        }
        long durableWritten = state == null ? c[2] : state.count(t.source());
        return new TableResult(t.source(), t.target(), c[0], c[1], durableWritten, errors);
    }

    private void streamUnorderedDryRun(Connection source, MappingSpec spec, TableMapping table,
                                       List<String> targetColumns, String insertSql,
                                       KeyMapRegistry registry, MigrationStateStore state,
                                       Connection target, long[] counts, List<String> errors) throws SQLException {
        String sql = buildSourcePageSql(table, false);
        try (PreparedStatement statement = source.prepareStatement(sql)) {
            statement.setFetchSize(CHUNK);
            try (ResultSet result = statement.executeQuery()) {
                String[] labels = lowerLabels(result.getMetaData());
                List<Map<String, Object>> chunk = new ArrayList<>(CHUNK);
                while (result.next()) {
                    counts[0]++;
                    chunk.add(readRow(result, labels));
                    if (chunk.size() == CHUNK) {
                        processChunk(chunk, spec, table, targetColumns, insertSql, registry, state,
                                target, counts, errors);
                        chunk.clear();
                    }
                }
                if (!chunk.isEmpty()) {
                    processChunk(chunk, spec, table, targetColumns, insertSql, registry, state,
                            target, counts, errors);
                }
            }
        }
    }

    private void readKeysetPages(Connection source, MappingSpec spec, TableMapping table,
                                 List<String> targetColumns, String insertSql,
                                 KeyMapRegistry registry, MigrationStateStore state,
                                 Connection target, long[] counts, List<String> errors) throws SQLException {
        List<Object> cursor = null;
        Set<String> seenSourceKeys = new HashSet<>();
        boolean hasMore;
        do {
            SourcePage page = readSourcePage(source, table, cursor);
            hasMore = page.hasMore();
            List<Map<String, Object>> accepted = new ArrayList<>(page.rows().size());
            for (Map<String, Object> row : page.rows()) {
                counts[0]++;
                String sourceKey = sourceKey(row, table);
                if (!seenSourceKeys.add(sourceKey)) {
                    throw new SQLException(
                            "중복 orderBy source identity(" + table.source() + "): " + sourceKey);
                }
                accepted.add(row);
            }
            if (!accepted.isEmpty()) {
                processChunk(accepted, spec, table, targetColumns, insertSql, registry, state,
                        target, counts, errors);
            }
            if (!page.rows().isEmpty()) {
                cursor = orderValues(page.rows().get(page.rows().size() - 1), table);
            }
        } while (hasMore);
    }

    private record SourcePage(List<Map<String, Object>> rows, boolean hasMore) {}

    private static SourcePage readSourcePage(Connection source, TableMapping table,
                                             List<Object> cursor) throws SQLException {
        String sql = buildSourcePageSql(table, cursor != null);
        try (PreparedStatement statement = source.prepareStatement(sql)) {
            if (cursor != null) {
                bindSeek(statement, cursor);
            }
            statement.setFetchSize(CHUNK + 1);
            statement.setMaxRows(CHUNK + 1);
            try (ResultSet result = statement.executeQuery()) {
                String[] labels = lowerLabels(result.getMetaData());
                List<Map<String, Object>> rows = new ArrayList<>(CHUNK + 1);
                while (result.next()) {
                    rows.add(readRow(result, labels));
                }
                boolean hasMore = rows.size() > CHUNK;
                if (hasMore) {
                    Map<String, Object> boundary = rows.remove(rows.size() - 1);
                    String lastKey = sourceKey(rows.get(rows.size() - 1), table);
                    if (lastKey.equals(sourceKey(boundary, table))) {
                        throw new SQLException(table.source()
                                + ": keyset page 경계의 order identity 중복: " + lastKey);
                    }
                }
                return new SourcePage(rows, hasMore);
            }
        }
    }

    static String buildSourcePageSql(TableMapping table, boolean seek) {
        StringBuilder sql = new StringBuilder("SELECT * FROM ")
                .append(SourceIntrospector.qualifiedIdent(table.source()));
        List<String> conditions = new ArrayList<>();
        if (!isBlank(table.where())) {
            conditions.add(seek ? "(" + table.where() + ")" : table.where());
        }
        if (seek) {
            conditions.add(seekPredicate(table.effectiveOrderKeys()));
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        if (!table.effectiveOrderKeys().isEmpty()) {
            sql.append(" ORDER BY ").append(orderByClause(table));
        }
        return sql.toString();
    }

    private static String seekPredicate(List<String> keys) {
        List<String> branches = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            List<String> terms = new ArrayList<>();
            for (int j = 0; j < i; j++) {
                terms.add(SourceIntrospector.ident(keys.get(j)) + " = ?");
            }
            terms.add(SourceIntrospector.ident(keys.get(i)) + " > ?");
            branches.add("(" + String.join(" AND ", terms) + ")");
        }
        return "(" + String.join(" OR ", branches) + ")";
    }

    private static void bindSeek(PreparedStatement statement, List<Object> cursor) throws SQLException {
        int parameter = 1;
        for (int i = 0; i < cursor.size(); i++) {
            for (int j = 0; j <= i; j++) {
                statement.setObject(parameter++, cursor.get(j));
            }
        }
    }

    private void preMintSelfReferences(Connection sourceConnection, Connection targetConn,
                                       TableMapping table, KeyMapRegistry registry) throws SQLException {
        boolean selfReference = table.columns().stream().anyMatch(column ->
                !isBlank(column.fkRef()) && column.fkRef().equalsIgnoreCase(table.source()));
        if (!selfReference) {
            return;
        }
        IdStrategy id = table.idStrategy();
        if (id == null || isBlank(id.sourceKey()) || isBlank(id.generator())) {
            throw new SQLException(table.source() + ": 자기참조 2-pass에는 완전한 idStrategy가 필수입니다");
        }
        if (table.effectiveOrderKeys().isEmpty()) {
            throw new SQLException(table.source()
                    + ": 자기참조 2-pass에는 명시적 orderBy/orderByKeys가 필수입니다");
        }

        Checkpoint reservation = registry.checkpoint();
        String sql = "SELECT " + SourceIntrospector.ident(id.sourceKey()) + " FROM "
                + SourceIntrospector.qualifiedIdent(table.source())
                + (isBlank(table.where()) ? "" : " WHERE " + table.where())
                + " ORDER BY " + orderByClause(table);
        Set<String> seen = new HashSet<>();
        try (PreparedStatement statement = sourceConnection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Object raw = result.getObject(1);
                if (raw == null || raw.toString().isBlank()) {
                    throw new SQLException(table.source() + ": 자기참조 sourceKey가 null/blank입니다");
                }
                String legacyKey = raw.toString();
                if (!seen.add(legacyKey)) {
                    throw new SQLException(table.source() + ": 자기참조 sourceKey 중복: " + legacyKey);
                }
                registry.mintOrGet(table.source(), legacyKey, id.generator());
            }
        } catch (SQLException | RuntimeException e) {
            registry.rollback(reservation);
            throw e;
        }

        if (targetConn == null) {
            registry.accept(reservation);
            return;
        }
        try {
            registry.writePending(targetConn, reservation);
            targetConn.commit();
            registry.accept(reservation);
        } catch (SQLException e) {
            safeRollback(targetConn);
            registry.rollback(reservation);
            throw e;
        }
    }

    private void processChunk(List<Map<String, Object>> chunk, MappingSpec spec, TableMapping t,
                              List<String> targetCols, String insertSql, KeyMapRegistry reg,
                              MigrationStateStore state, Connection targetConn,
                              long[] c, List<String> errors) {
        Checkpoint chunkCheckpoint = reg.checkpoint();
        List<PreparedRow> batch = new ArrayList<>(chunk.size());
        for (Map<String, Object> row : chunk) {
            Checkpoint rowCheckpoint = reg.checkpoint();
            try {
                Map<String, Object> out = transformRow(row, spec, t, reg);
                c[1]++;
                CheckpointEntry checkpoint = state == null ? null : checkpoint(row, out, t, targetCols);
                CheckpointEntry durable = state == null ? null : state.find(t.source(), checkpoint.sourceKey());
                if (durable != null) {
                    if (!durable.rowChecksum().equals(checkpoint.rowChecksum())
                            || !durable.targetKey().equals(checkpoint.targetKey())
                            || !durable.targetTable().equalsIgnoreCase(checkpoint.targetTable())) {
                        errors.add("resume checkpoint/source checksum 불일치(" + t.source()
                                + ", key=" + checkpoint.sourceKey() + ")");
                    }
                    reg.rollback(rowCheckpoint);
                    continue;
                }
                batch.add(new PreparedRow(row, toArguments(out, targetCols), checkpoint));
            } catch (RuntimeException e) {
                reg.rollback(rowCheckpoint);
                errors.add("행 변환 실패(" + t.source() + "): " + e.getMessage());
            }
        }
        if (batch.isEmpty()) {
            reg.rollback(chunkCheckpoint);
            return;
        }
        if (targetConn == null) {
            // dry-run에서도 이후 자식 fkRef 검증에 성공한 부모 keymap은 필요하지만 pending 표식은 남기지 않는다.
            reg.accept(chunkCheckpoint);
            return;
        }
        c[2] += writeChunkAtomically(
                targetConn, insertSql, batch, spec, t, targetCols, reg, state,
                chunkCheckpoint, errors);
    }

    private record PreparedRow(Map<String, Object> source, Object[] arguments,
                               CheckpointEntry checkpoint) {}

    private static CheckpointEntry checkpoint(Map<String, Object> source, Map<String, Object> transformed,
                                              TableMapping table, List<String> targetColumns) {
        String sourceKey = sourceKey(source, table);
        Object targetValue = transformed.get(targetIdentityColumn(table));
        if (targetValue == null || targetValue.toString().isBlank()) {
            throw new IllegalStateException(table.source() + ": target identity가 null/blank입니다");
        }
        return new CheckpointEntry(table.source(), sourceKey, table.target(), targetValue.toString(),
                RowChecksum.calculate(targetColumns, transformed));
    }

    private static String sourceKey(Map<String, Object> source, TableMapping table) {
        List<Object> values = orderValues(source, table);
        if (values.size() == 1) {
            return values.get(0).toString(); // 기존 단일키 checkpoint identity 호환
        }
        StringBuilder encoded = new StringBuilder();
        for (Object value : values) {
            String text = value.toString();
            encoded.append(text.length()).append(':').append(text).append('|');
        }
        if (encoded.length() > 256) {
            throw new IllegalStateException("복합 order identity가 checkpoint varchar(256)을 초과합니다");
        }
        return encoded.toString();
    }

    private static List<Object> orderValues(Map<String, Object> source, TableMapping table) {
        List<Object> values = new ArrayList<>(table.effectiveOrderKeys().size());
        for (String key : table.effectiveOrderKeys()) {
            Object value = source.get(key.toLowerCase(Locale.ROOT));
            if (value == null || value.toString().isBlank()) {
                throw new IllegalStateException("order source key가 null/blank: " + key);
            }
            values.add(value);
        }
        return values;
    }

    private static String orderByClause(TableMapping table) {
        return String.join(", ", table.effectiveOrderKeys().stream()
                .map(SourceIntrospector::ident)
                .toList());
    }

    private static Object[] toArguments(Map<String, Object> transformed, List<String> targetColumns) {
        Object[] arguments = new Object[targetColumns.size()];
        for (int i = 0; i < targetColumns.size(); i++) {
            arguments[i] = transformed.get(targetColumns.get(i));
        }
        return arguments;
    }

    private Map<String, Object> transformRow(Map<String, Object> src, MappingSpec spec, TableMapping t, KeyMapRegistry reg) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (ColumnMapping col : t.columns()) {
            Object value;
            if (col.constant() != null) {
                value = col.constant();
            } else if (col.source() != null) {
                value = src.get(col.source().toLowerCase(Locale.ROOT));
                if (col.codemap() != null && spec.codemaps().containsKey(col.codemap())) {
                    value = CodeMapper.map(spec.codemaps().get(col.codemap()), value == null ? null : value.toString());
                }
                value = transformers.apply(col.transform(), value);
                value = TypeConverter.convert(col.type(), value);
                value = applyFkRef(col, value, reg);
            } else {
                value = null;
            }
            out.put(col.target(), value);
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null) {
            Object legacy = id.sourceKey() == null ? null : src.get(id.sourceKey().toLowerCase(Locale.ROOT));
            String newKey = reg.mintOrGet(t.source(), legacy == null ? null : legacy.toString(), id.generator());
            out.put(id.column(), newKey);
        }
        return out;
    }

    /** 자식 FK 값을 부모 키맵으로 신규 키에 번역. 미매핑(고아)은 예외로 격리(행 변환 실패). null 은 통과. */
    private Object applyFkRef(ColumnMapping col, Object value, KeyMapRegistry reg) {
        if (col.fkRef() == null || col.fkRef().isBlank() || value == null) {
            return value;
        }
        String translated = reg.translate(col.fkRef(), value.toString());
        if (translated == null) {
            throw new IllegalStateException("FK 고아: 부모 '" + col.fkRef() + "' 키맵에 '" + value + "' 없음");
        }
        return translated;
    }

    private long writeChunkAtomically(Connection connection, String sql, List<PreparedRow> rows,
                                      MappingSpec spec, TableMapping table, List<String> targetColumns,
                                      KeyMapRegistry registry, MigrationStateStore state,
                                      Checkpoint checkpoint, List<String> errors) {
        List<Object[]> batch = rows.stream().map(PreparedRow::arguments).toList();
        List<CheckpointEntry> checkpoints = rows.stream().map(PreparedRow::checkpoint).toList();
        long written;
        try {
            written = executeBatch(connection, sql, batch);
            registry.writePending(connection, checkpoint);
            state.write(connection, checkpoints);
        } catch (SQLException e) {
            rollbackAndDiscard(connection, registry, checkpoint, table.target());
            return writeRowsAtomically(
                    connection, sql, rows, spec, table, targetColumns, registry, state, errors);
        }
        commitAndAccept(connection, registry, checkpoint, state, checkpoints, table.target());
        return written;
    }

    private long writeRowsAtomically(Connection connection, String sql, List<PreparedRow> rows,
                                     MappingSpec spec, TableMapping table, List<String> targetColumns,
                                     KeyMapRegistry registry, MigrationStateStore state,
                                     List<String> errors) {
        long written = 0L;
        for (PreparedRow row : rows) {
            Checkpoint rowCheckpoint = registry.checkpoint();
            Object[] arguments;
            CheckpointEntry durableCheckpoint;
            try {
                Map<String, Object> transformed = transformRow(row.source(), spec, table, registry);
                arguments = toArguments(transformed, targetColumns);
                durableCheckpoint = checkpoint(row.source(), transformed, table, targetColumns);
            } catch (RuntimeException transformFailure) {
                registry.rollback(rowCheckpoint);
                errors.add("행 재변환 실패(" + table.source() + "): " + transformFailure.getMessage());
                continue;
            }

            try {
                int updateCount = executeSingle(connection, sql, arguments);
                registry.writePending(connection, rowCheckpoint);
                state.write(connection, List.of(durableCheckpoint));
                commitAndAccept(connection, registry, rowCheckpoint, state,
                        List.of(durableCheckpoint), table.target());
                written += updateCount;
            } catch (SQLException rowFailure) {
                rollbackAndDiscard(connection, registry, rowCheckpoint, table.target());
                errors.add("원자 INSERT/keymap 실패(" + table.target() + "): " + rowFailure.getMessage());
            }
        }
        return written;
    }

    private static long executeBatch(Connection connection, String sql, List<Object[]> batch) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            return executeBatch(statement, batch);
        }
    }

    static long executeBatch(PreparedStatement statement, List<Object[]> batch) throws SQLException {
        for (Object[] arguments : batch) {
            bind(statement, arguments);
            statement.addBatch();
        }
        int[] updateCounts = statement.executeBatch();
        long written = exactInsertedRows(updateCounts, batch.size());
        if (written < 0) {
            throw new SQLException("data JDBC batch updateCounts가 정확한 1행 기록을 증명하지 못했습니다");
        }
        return written;
    }

    private static int executeSingle(Connection connection, String sql, Object[] arguments) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, arguments);
            int updateCount = statement.executeUpdate();
            if (updateCount != 1) {
                throw new SQLException("INSERT 영향행 불일치: expected=1, actual=" + updateCount);
            }
            return updateCount;
        }
    }

    /** 각 입력 행이 정확히 한 행을 기록했다는 것을 JDBC updateCounts로 증명한다. */
    static long exactInsertedRows(int[] updateCounts, int expectedStatements) {
        if (updateCounts == null || updateCounts.length != expectedStatements) {
            return -1L;
        }
        long written = 0L;
        for (int count : updateCounts) {
            if (count == Statement.SUCCESS_NO_INFO || count == Statement.EXECUTE_FAILED || count != 1) {
                return -1L;
            }
            written = Math.addExact(written, count);
        }
        return written;
    }

    private static void rollbackAndDiscard(Connection connection, KeyMapRegistry registry,
                                           Checkpoint checkpoint, String table) {
        SQLException rollbackFailure = null;
        try {
            connection.rollback();
        } catch (SQLException e) {
            rollbackFailure = e;
        }
        registry.rollback(checkpoint);
        if (rollbackFailure != null) {
            throw new AtomicTransactionException(
                    "target rollback 결과 불확정(" + table + ") — 재시도를 중단합니다", rollbackFailure);
        }
    }

    private static void commitAndAccept(Connection connection, KeyMapRegistry registry,
                                        Checkpoint checkpoint, MigrationStateStore state,
                                        List<CheckpointEntry> checkpoints, String table) {
        try {
            connection.commit();
        } catch (SQLException commitFailure) {
            registry.rollback(checkpoint);
            throw new AtomicTransactionException(
                    "data/keymap 원자 commit 결과 불확정(" + table + ") — 재시도를 중단합니다", commitFailure);
        }
        registry.accept(checkpoint);
        state.accept(checkpoints);
    }

    private static final class AtomicTransactionException extends IllegalStateException {
        private AtomicTransactionException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private static void bind(PreparedStatement ps, Object[] args) throws SQLException {
        for (int i = 0; i < args.length; i++) {
            ps.setObject(i + 1, args[i]);
        }
    }

    public static List<String> canonicalTargetColumns(TableMapping t) {
        List<String> cols = new ArrayList<>();
        for (ColumnMapping c : t.columns()) {
            if (c.target() != null && !cols.contains(c.target())) {
                cols.add(c.target());
            }
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null && !cols.contains(id.column())) {
            cols.add(id.column());
        }
        return cols;
    }

    public static String targetIdentityColumn(TableMapping table) {
        IdStrategy id = table.idStrategy();
        if (id != null && !isBlank(id.column())) {
            return id.column();
        }
        return table.targetKey();
    }

    private static String buildInsertSql(String table, List<String> cols) {
        String colList = String.join(", ", cols.stream().map(SourceIntrospector::ident).toList());
        String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
        return "INSERT INTO " + SourceIntrospector.qualifiedIdent(table) + " (" + colList + ") VALUES (" + placeholders + ")";
    }

    private static String[] lowerLabels(ResultSetMetaData md) throws SQLException {
        String[] labels = new String[md.getColumnCount()];
        for (int i = 0; i < labels.length; i++) {
            labels[i] = md.getColumnLabel(i + 1).toLowerCase(Locale.ROOT);
        }
        return labels;
    }

    private static Map<String, Object> readRow(ResultSet rs, String[] labels) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < labels.length; i++) {
            row.put(labels[i], rs.getObject(i + 1));
        }
        return row;
    }

    private static void safeRollback(Connection conn) {
        if (conn == null) {
            return;
        }
        try {
            conn.rollback();
        } catch (SQLException ignore) {
            // 롤백 실패는 원인 오류를 덮지 않도록 무시
        }
    }

    private static void safeClose(Connection conn) {
        if (conn == null) {
            return;
        }
        try {
            conn.close();
        } catch (SQLException ignore) {
            // close 실패 무시
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
