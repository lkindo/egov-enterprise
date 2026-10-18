package nuri.migration.etl;

import nuri.migration.archive.ArchiveRun.DumpOnlyRead;
import nuri.migration.etl.EtlExecutor.RowFailureReason;
import nuri.migration.etl.EtlExecutor.RowTransformFailure;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.lookup.LookupMisses;
import nuri.migration.lookup.LookupRef;
import nuri.migration.lookup.LookupResolver;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.verify.ReconciliationRun.AggregateGroup;
import nuri.migration.verify.SourceAggregates;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static nuri.migration.etl.EtlExecutor.ORDER_KEY_NULL;

/**
 * {@link EtlExecutor}의 원천 읽기 SQL 생성·정렬 키/조회 키 유일성 사전 검증·원천 집계 측정·chunk 조회 조인 해결을 담당한다.
 */
public final class EtlSourceQuerySupport {

    private EtlSourceQuerySupport() {
    }

    /**
     * [ADR-0029 L3e] 덤프만 하는 표의 정렬 키가 NULL 인 행이 없고 정렬 키가 유일한지 같은 읽기 세션의 DB 비교 의미로 먼저
     * 증명한다. 증명하지 못하면 표 이름과 고정 사유를 돌려준다(행을 읽거나 쓰지 않는다).
     */
    static String preflightDumpOnlyKeys(Connection source, List<DumpOnlyRead> reads) {
        for (DumpOnlyRead read : reads) {
            try {
                requireNonNullOrderKeys(source, read.table());
                requireUniqueOrderTuple(source, read.table());
            } catch (SQLException failure) {
                return ORDER_KEY_NULL.equals(failure.getMessage())
                        ? "보관 덤프 정렬 키 확인 실패(" + read.table().source() + "): " + ORDER_KEY_NULL
                        : "보관 덤프 정렬 키 유일성 확인 실패(" + read.table().source() + "): ORDER_TUPLE_UNIQUENESS_UNPROVEN";
            }
        }
        return null;
    }

    /**
     * 행을 읽기 전에 정렬 키를 증명한다. 정렬 키가 있는 표는 어느 모드든 NULL 키 행이 없어야 하고(첫 page 밖의 NULL 키 행은
     * keyset 이 다시 읽지 못해 조용히 빠진다 — ADR-0029 L3e 검토), commit 은 정렬 키 유일성과 [ADR-0029 L3d] 그다음 조회
     * 표(where 적용)의 조회 키 유일성을 같은 읽기 트랜잭션에서 증명한다. 증명하지 못하면 행을 읽거나 쓰기 전에 멈춘다.
     */
    static TableResult preflightOrderTupleUniqueness(
            Connection source,
            List<TableMapping> orderedTables,
            boolean commit
    ) {
        for (TableMapping table : orderedTables) {
            try {
                if (!table.effectiveOrderKeys().isEmpty()) {
                    requireNonNullOrderKeys(source, table);
                }
                if (commit) {
                    requireUniqueOrderTuple(source, table);
                }
            } catch (SQLException failure) {
                String reason = ORDER_KEY_NULL.equals(failure.getMessage()) ? ORDER_KEY_NULL : "SQL_EXECUTION_FAILED";
                return new TableResult(
                        table.source(), table.target(), 0, 0, 0,
                        List.of("이관 실패(" + label(table) + "): " + reason),
                        List.of(), Map.of(), table.id());
            }
        }
        if (!commit) {
            return null;
        }
        for (TableMapping table : orderedTables) {
            for (Lookup lookup : table.lookups()) {
                try {
                    requireUniqueLookupKey(source, lookup);
                } catch (SQLException ignored) {
                    return new TableResult(
                            table.source(), table.target(), 0, 0, 0,
                            List.of("이관 실패(" + label(table) + "): LOOKUP_KEY_UNIQUENESS_UNPROVEN(" + lookup.alias()
                                    + ") — 조회 표의 키가 유일하지 않거나 확인하지 못했습니다"),
                            List.of(), Map.of(), table.id());
                }
            }
        }
        return null;
    }

    /**
     * [ADR-0029 L4 D2] (소스, where) 묶음마다 원천 집계 문장 하나를 본 읽기와 같은 읽기 세션에서 보낸다. 집계 문장이 실패하면
     * savepoint 로 되돌리고 COUNT 전용 문장으로 물러난다 — 그 묶음의 합·최소·최대는 판정하지 않는다
     * ({@code SOURCE_AGGREGATE_FAILED}). PostgreSQL 은 실패한 문장이 읽기 트랜잭션 전체를 막으므로 savepoint 가 필요하다.
     * savepoint 를 만들 수 없으면 없이 보내고, COUNT 전용 문장도 실패하면 행을 읽지 않고 멈춘다(그 묶음의 첫 매핑 결과에
     * 고정 사유와 SQLSTATE 만 남긴다 — 원천 권한·형 변환·세션 설정을 가르는 근거다). 집계 값은 대사 홀더에만 두고 결과·문구에
     * 싣지 않는다. SQL Server 원천은 {@code COUNT_BIG} 으로 센다. 비활성이면 아무 문장도 보내지 않는다.
     */
    static TableResult measureSourceAggregates(Connection source, List<TableMapping> orderedTables,
                                               ReconciliationRun reconciliation) throws SQLException {
        if (!reconciliation.active()) {
            return null;
        }
        boolean bigCount = "Microsoft SQL Server".equals(source.getMetaData().getDatabaseProductName());
        for (AggregateGroup group : reconciliation.aggregateGroups()) {
            AggregateRead read = readSourceAggregates(source, group, bigCount);
            SourceAggregates aggregates = read.aggregates();
            if (aggregates == null) {
                TableMapping table = orderedTables.stream()
                        .filter(candidate -> group.labels().stream()
                                .anyMatch(label -> label.equalsIgnoreCase(label(candidate))))
                        .findFirst().orElse(null);
                String label = table == null ? group.source() : label(table);
                return new TableResult(table == null ? group.source() : table.source(),
                        table == null ? group.source() : table.target(), 0, 0, 0,
                        List.of("이관 실패(" + label + "): SOURCE_AGGREGATE_FAILED(SQLSTATE=" + read.sqlState() + ")"),
                        List.of(), Map.of(), table == null ? null : table.id());
            }
            reconciliation.recordSource(group.key(), aggregates);
        }
        return null;
    }

    /** 원천 집계 결과. 둘 다 실패했으면 {@code aggregates} 가 null 이고 COUNT 전용 문장의 SQLSTATE(없으면 {@code -})를 담는다. */
    private record AggregateRead(SourceAggregates aggregates, String sqlState) {}

    /** 집계 문장, 실패하면 COUNT 전용 문장. 둘 다 실패하면 집계 없이 COUNT 전용 문장의 SQLSTATE 만 돌려준다. */
    private static AggregateRead readSourceAggregates(Connection source, AggregateGroup group, boolean bigCount) {
        Savepoint savepoint = savepoint(source);
        try {
            SourceAggregates full = readAggregateRow(source, group.query().sql(bigCount), group, true);
            releaseSavepoint(source, savepoint);
            return new AggregateRead(full, null);
        } catch (SQLException | RuntimeException aggregateFailed) {
            if (savepoint != null) {
                try {
                    source.rollback(savepoint);
                } catch (SQLException ignored) {
                    // 되돌리지 못하면 COUNT 전용 문장도 실패해 멈춘다.
                }
            }
        }
        try {
            SourceAggregates counts = readAggregateRow(source, group.query().countOnlySql(bigCount), group, false);
            releaseSavepoint(source, savepoint);
            return new AggregateRead(counts, null);
        } catch (SQLException | RuntimeException countFailed) {
            // 메시지·SQL 원문은 버린다 — 형 변환 오류 문구에는 원천 값이 들어간다.
            return new AggregateRead(null, EtlExecutor.sqlState(countFailed));
        }
    }

    private static SourceAggregates readAggregateRow(Connection source, String sql, AggregateGroup group,
                                                     boolean full) throws SQLException {
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql);
             ResultSet rows = statement.executeQuery()) {
            if (!rows.next()) {
                throw new SQLException("SOURCE_AGGREGATE_UNREADABLE");
            }
            Object[] values = new Object[rows.getMetaData().getColumnCount()];
            for (int column = 0; column < values.length; column++) {
                // 본 읽기와 같은 값 읽기다 — 벤더 값 타입의 변환도 같다.
                values[column] = JdbcLobReader.read(rows, column + 1, false);
            }
            return group.query().parse(values, full);
        }
    }

    /** savepoint 를 만들 수 없는 드라이버는 null — savepoint 없이 보낸다. */
    private static Savepoint savepoint(Connection source) {
        try {
            return source.setSavepoint();
        } catch (SQLException | RuntimeException unsupported) {
            return null;
        }
    }

    private static void releaseSavepoint(Connection source, Savepoint savepoint) {
        if (savepoint == null) {
            return;
        }
        try {
            source.releaseSavepoint(savepoint);
        } catch (SQLException | RuntimeException ignored) {
            // 해제하지 못한 savepoint 는 읽기 트랜잭션이 끝날 때 함께 사라진다.
        }
    }

    /** 조회 표(where 적용)에서 NULL 이 아닌 조회 키가 둘 이상인 값이 없음을 DB 의 비교 의미로 증명한다. */
    private static void requireUniqueLookupKey(Connection source, Lookup lookup) throws SQLException {
        String key = SourceIntrospector.ident(lookup.key().to());
        String sql = "SELECT " + key + ", COUNT(*) FROM " + SourceIntrospector.qualifiedIdent(lookup.source())
                + " WHERE " + (isBlank(lookup.where()) ? "" : "(" + lookup.where() + ") AND ") + key + " IS NOT NULL"
                + " GROUP BY " + key + " HAVING COUNT(*) > 1";
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql)) {
            statement.setMaxRows(1);
            try (ResultSet duplicates = statement.executeQuery()) {
                if (duplicates.next()) {
                    throw new SQLException("LOOKUP_KEY_UNIQUENESS_UNPROVEN");
                }
            }
        } catch (SQLException ignored) {
            throw new SQLException("LOOKUP_KEY_UNIQUENESS_UNPROVEN");
        }
    }

    /**
     * keyset 의 다음 page 조건({@code >}·{@code =})은 NULL 을 다시 읽지 못한다. NULL 을 뒤로 정렬하는 소스(PostgreSQL·
     * Oracle)는 첫 page 밖의 NULL 키 행을 적재·덤프에서 조용히 빠뜨리고, 읽은 행으로 센 수끼리 대조하는 검증도 그 손실을
     * 보지 못한다. 같은 읽기 세션에서 그런 행이 없음을 먼저 증명한다 — 있으면 {@link EtlExecutor#ORDER_KEY_NULL}, 증명하지 못하면
     * 정렬 키 유일성 실패와 같은 사유다.
     */
    private static void requireNonNullOrderKeys(Connection source, TableMapping table) throws SQLException {
        List<String> orderKeys = table.effectiveOrderKeys();
        if (orderKeys.isEmpty()) {
            throw new SQLException("ORDER_TUPLE_UNIQUENESS_UNPROVEN");
        }
        String nulls = String.join(" OR ", orderKeys.stream()
                .map(key -> SourceIntrospector.ident(key) + " IS NULL")
                .toList());
        String sql = "SELECT 1 FROM " + SourceIntrospector.qualifiedIdent(table.source())
                + " WHERE " + (isBlank(table.where()) ? "" : "(" + table.where() + ") AND ") + "(" + nulls + ")";
        boolean found;
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql)) {
            statement.setMaxRows(1);
            try (ResultSet rows = statement.executeQuery()) {
                found = rows.next();
            }
        } catch (SQLException ignored) {
            throw new SQLException("ORDER_TUPLE_UNIQUENESS_UNPROVEN");
        }
        if (found) {
            throw new SQLException(ORDER_KEY_NULL);
        }
    }

    /** 같은 source transaction의 DB 비교 의미로 keyset order tuple 유일성을 먼저 증명한다. */
    private static void requireUniqueOrderTuple(Connection source, TableMapping table) throws SQLException {
        List<String> orderKeys = table.effectiveOrderKeys();
        if (orderKeys.isEmpty()) {
            throw new SQLException("ORDER_TUPLE_UNIQUENESS_UNPROVEN");
        }
        String keys = String.join(", ", orderKeys.stream()
                .map(SourceIntrospector::ident)
                .toList());
        String sql = "SELECT " + keys + ", COUNT(*) FROM "
                + SourceIntrospector.qualifiedIdent(table.source())
                + (isBlank(table.where()) ? "" : " WHERE " + table.where())
                + " GROUP BY " + keys + " HAVING COUNT(*) > 1";
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql)) {
            statement.setMaxRows(1);
            try (ResultSet duplicates = statement.executeQuery()) {
                if (duplicates.next()) {
                    throw new SQLException("ORDER_TUPLE_UNIQUENESS_UNPROVEN");
                }
            }
        } catch (SQLException ignored) {
            throw new SQLException("ORDER_TUPLE_UNIQUENESS_UNPROVEN");
        }
    }

    /**
     * [ADR-0029 L3d] chunk 의 조회 키로 조회 표를 읽어 행에 {@code alias.column} 값을 넣고 행마다 조회 결과를 남긴다. 조회
     * 표는 키 IN 조건으로 {@link LookupResolver#MAX_KEYS_PER_QUERY} 개씩 같은 연결·같은 읽기 트랜잭션에서 읽는다. 멈출 행은
     * 그 행의 처리 차례에 {@link ChunkLookups#check} 가 알린다 — chunk 의 앞 행이 다른 이유로 먼저 실패하면 그쪽이 먼저다.
     */
    static ChunkLookups resolveLookups(Connection source, TableMapping table, List<Map<String, Object>> rows)
            throws SQLException {
        if (table.lookups().isEmpty()) {
            return ChunkLookups.NONE;
        }
        boolean boundedVariableValues = "Microsoft SQL Server".equals(source.getMetaData().getDatabaseProductName());
        Map<Map<String, Object>, List<RowLookup>> resolved = new IdentityHashMap<>();
        for (Lookup lookup : table.lookups()) {
            String from = lookup.key().from().toLowerCase(Locale.ROOT);
            List<Object> keys = new ArrayList<>(rows.size());
            for (Map<String, Object> row : rows) {
                keys.add(row.get(from));
            }
            LookupResolver.Request request = LookupResolver.request(keys);
            List<String> read = SourceProjection.lookupColumns(table, lookup);
            List<Map<String, Object>> fetched = new ArrayList<>();
            for (List<Object> batch : request.batches()) {
                fetched.addAll(readLookupRows(source, lookup, read, batch, boundedVariableValues));
            }
            String keyColumn = lookup.key().to().toLowerCase(Locale.ROOT);
            // 정확히 같은 글자의 짝이 없는 키를 DB 에 다시 묻는다 — DB 가 찾으면 비교 의미가 달라 chunk 구성과 무관하게 멈춘다.
            boolean unmatchedFoundByDatabase = false;
            for (List<Object> batch : LookupResolver.batches(
                    LookupResolver.unmatchedBindValues(request, keyColumn, fetched))) {
                if (lookupKeyExists(source, lookup, batch)) {
                    unmatchedFoundByDatabase = true;
                    break;
                }
            }
            List<String> values = SourceProjection.lookupValueColumns(table, lookup).stream()
                    .map(column -> column.toLowerCase(Locale.ROOT))
                    .toList();
            List<LookupResolver.Outcome> outcomes = LookupResolver.match(lookup, request, keyColumn, values, fetched,
                    unmatchedFoundByDatabase);
            long maxMissing = lookup.maxMissing() == null ? 0L : lookup.maxMissing();
            for (int index = 0; index < rows.size(); index++) {
                LookupResolver.Outcome outcome = outcomes.get(index);
                Map<String, Object> row = rows.get(index);
                if (outcome.failure() == null) {
                    row.putAll(outcome.values());
                }
                resolved.computeIfAbsent(row, ignored -> new ArrayList<>(1))
                        .add(new RowLookup(lookup.alias(), outcome, maxMissing));
            }
        }
        return new ChunkLookups(resolved);
    }

    /**
     * 조회 표에서 이 키들의 행을 읽는다. 키 값은 바인딩하고 문구에 싣지 않는다. 값은 주 표와 같은 {@link #readRow}
     * ({@link JdbcLobReader})로 읽는다 — 드라이버 고유 시각 값도 {@code Timestamp} 로 와서 도메인 변환기가 시각으로 본다
     * (ADR-0029 L4-B R1).
     */
    private static List<Map<String, Object>> readLookupRows(Connection source, Lookup lookup, List<String> columns,
                                                            List<Object> keys, boolean boundedVariableValues)
            throws SQLException {
        String select = String.join(", ", columns.stream().map(SourceIntrospector::ident).toList());
        List<Map<String, Object>> rows = new ArrayList<>();
        try (PreparedStatement statement = SourceReadStatements.prepare(source, lookupSql(lookup, select, keys))) {
            bindLookupKeys(statement, keys);
            try (ResultSet result = statement.executeQuery()) {
                String[] labels = lowerLabels(result.getMetaData());
                while (result.next()) {
                    rows.add(readRow(result, labels, boundedVariableValues));
                }
            }
        }
        return rows;
    }

    /** DB 의 비교 의미로 이 키들 가운데 하나라도 조회 표(where 적용)에 행이 있는가. 키 값은 바인딩한다. */
    private static boolean lookupKeyExists(Connection source, Lookup lookup, List<Object> keys) throws SQLException {
        String key = SourceIntrospector.ident(lookup.key().to());
        try (PreparedStatement statement = SourceReadStatements.prepare(source, lookupSql(lookup, key, keys))) {
            statement.setMaxRows(1);
            bindLookupKeys(statement, keys);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private static String lookupSql(Lookup lookup, String select, List<Object> keys) {
        return "SELECT " + select + " FROM " + SourceIntrospector.qualifiedIdent(lookup.source())
                + " WHERE " + (isBlank(lookup.where()) ? "" : "(" + lookup.where() + ") AND ")
                + SourceIntrospector.ident(lookup.key().to())
                + " IN (" + String.join(", ", Collections.nCopies(keys.size(), "?")) + ")";
    }

    private static void bindLookupKeys(PreparedStatement statement, List<Object> keys) throws SQLException {
        for (int index = 0; index < keys.size(); index++) {
            statement.setObject(index + 1, keys.get(index));
        }
    }

    /** 한 행의 조회 하나의 결과와 그 조회의 짝 없는 행 상한. */
    private record RowLookup(String alias, LookupResolver.Outcome outcome, long maxMissing) {}

    /** 한 chunk 의 행마다 조회 결과(ADR-0029 L3d). 행 처리 차례에 멈출 행을 알리고 짝 없는 행을 센다. 값은 담지 않는다. */
    static final class ChunkLookups {
        static final ChunkLookups NONE = new ChunkLookups(new IdentityHashMap<>());

        private final Map<Map<String, Object>, List<RowLookup>> rows;

        private ChunkLookups(Map<Map<String, Object>, List<RowLookup>> rows) {
            this.rows = rows;
        }

        /** 이 행의 조회가 멈추게 하면 그 사유로, 짝 없는 행이 상한을 넘으면 {@code LOOKUP_MISSING_CAP_EXCEEDED} 로 멈춘다. */
        void check(Map<String, Object> row, LookupMisses misses) {
            requireResolved(row);
            countMisses(row, misses);
        }

        /**
         * 이 행의 조회가 멈추게 하면 그 사유로 멈춘다. 조회 실패({@code LOOKUP_*})는 격리하지 않는다(ADR-0029 L3b·L3d) —
         * 격리 판정의 대응표에 없는 사유라 수집 모드에서도 행을 멈춘다.
         */
        void requireResolved(Map<String, Object> row) {
            for (RowLookup lookup : rows.getOrDefault(row, List.of())) {
                LookupResolver.Outcome outcome = lookup.outcome();
                if (outcome.failure() != null) {
                    throw new RowTransformFailure(lookup.alias(), switch (outcome.failure()) {
                        case FANOUT -> RowFailureReason.LOOKUP_FANOUT;
                        case MISSING -> RowFailureReason.LOOKUP_MISSING;
                        case KEY_TYPE -> RowFailureReason.LOOKUP_KEY_TYPE;
                        case KEY_MISMATCH -> RowFailureReason.LOOKUP_KEY_MISMATCH;
                    });
                }
            }
        }

        /**
         * [ADR-0029 L3b·L3d] 수집 모드에서 짝 없는 at_most_one 조회의 컬럼은 NULL 이 된다. 그 컬럼에서 난 실패(NOT NULL 대상의
         * {@code REQUIRED_MISSING} 등)는 원장이 조회 표 컬럼에 승인한 위반이 아니라 짝이 없어서 난 것이다 — 격리하면 짝 없는
         * 행이 maxMissing 에 세이지 않은 채 다른 원인으로 기록된다. 조회 실패처럼 격리하지 않고 {@code LOOKUP_MISSING} 으로
         * 멈춘다. 짝이 없어도 다른 컬럼의 실패로 격리하는 행은 그대로다(적재하지 않으니 짝 없는 행으로 세지 않는다).
         */
        void requireNoFailureOfMissedLookup(Map<String, Object> row, TableMapping table,
                                            List<RuntimeException> failures) {
            Set<String> missed = new HashSet<>();
            for (RowLookup lookup : rows.getOrDefault(row, List.of())) {
                if (lookup.outcome().missed()) {
                    missed.add(lookup.alias().toLowerCase(Locale.ROOT));
                }
            }
            if (missed.isEmpty()) {
                return;
            }
            for (RuntimeException failure : failures) {
                if (!(failure instanceof RowTransformFailure classified) || classified.columnName() == null) {
                    continue;
                }
                for (ColumnMapping column : table.columns()) {
                    LookupRef ref = column == null || column.target() == null ? null : LookupRef.parse(column.source());
                    if (ref != null && column.target().equalsIgnoreCase(classified.columnName())
                            && missed.contains(ref.alias().toLowerCase(Locale.ROOT))) {
                        throw new RowTransformFailure(ref.alias(), RowFailureReason.LOOKUP_MISSING);
                    }
                }
            }
        }

        /** 짝 없는 행을 센다. 상한을 넘으면 {@code LOOKUP_MISSING_CAP_EXCEEDED} 로 멈춘다. 적재할 행에만 부른다. */
        void countMisses(Map<String, Object> row, LookupMisses misses) {
            for (RowLookup lookup : rows.getOrDefault(row, List.of())) {
                if (lookup.outcome().missed() && !misses.add(lookup.alias(), lookup.maxMissing())) {
                    throw new RowTransformFailure(lookup.alias(), RowFailureReason.LOOKUP_MISSING_CAP_EXCEEDED);
                }
            }
        }
    }

    static String buildSourcePageSql(TableMapping table, boolean seek) {
        return buildSourcePageSql(table, seek, List.of());
    }

    /**
     * {@code extraColumns}(보관 컬럼, ADR-0029 L3e)를 적재 projection 뒤에 더한다 — 이미 읽는 컬럼은 한 번만 읽는다(대소문자
     * 무시). 적재·checkpoint 판정은 표 매핑의 컬럼만 쓰므로 더한 컬럼이 그 의미를 바꾸지 않는다.
     */
    static String buildSourcePageSql(TableMapping table, boolean seek, List<String> extraColumns) {
        List<String> sourceColumns = new ArrayList<>(SourceProjection.requiredColumns(table));
        Set<String> projected = new HashSet<>();
        sourceColumns.forEach(column -> projected.add(column.toLowerCase(Locale.ROOT)));
        for (String extra : extraColumns) {
            if (projected.add(extra.toLowerCase(Locale.ROOT))) {
                sourceColumns.add(extra);
            }
        }
        String projection = sourceColumns.isEmpty()
                ? "1 AS __migration_row__"
                : String.join(", ", sourceColumns.stream()
                        .map(SourceIntrospector::ident)
                        .toList());
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(projection)
                .append(" FROM ")
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

    static void bindSeek(PreparedStatement statement, List<Object> cursor) throws SQLException {
        int parameter = 1;
        for (int i = 0; i < cursor.size(); i++) {
            for (int j = 0; j <= i; j++) {
                statement.setObject(parameter++, cursor.get(j));
            }
        }
    }

    static List<Object> orderValues(Map<String, Object> source, TableMapping table) {
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

    /** keyset order tuple 값은 외부 오류에 노출하지 않고 결정적 digest로만 비교한다. */
    static String orderDigest(Map<String, Object> source, TableMapping table) {
        orderValues(source, table); // null/blank order key를 먼저 fail-closed 한다.
        return RowChecksum.calculate(table.effectiveOrderKeys(), source);
    }

    static String orderByClause(TableMapping table) {
        return String.join(", ", table.effectiveOrderKeys().stream()
                .map(SourceIntrospector::ident)
                .toList());
    }

    static String[] lowerLabels(ResultSetMetaData md) throws SQLException {
        String[] labels = new String[md.getColumnCount()];
        for (int i = 0; i < labels.length; i++) {
            labels[i] = md.getColumnLabel(i + 1).toLowerCase(Locale.ROOT);
        }
        return labels;
    }

    static Map<String, Object> readRow(ResultSet rs, String[] labels, boolean boundedVariableValues)
            throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        long retainedBytes = 0;
        for (int i = 0; i < labels.length; i++) {
            Object value = JdbcLobReader.read(rs, i + 1, boundedVariableValues);
            retainedBytes += JdbcLobReader.retainedBytes(value);
            JdbcLobReader.requireRowSize(retainedBytes);
            row.put(labels[i], value);
        }
        return row;
    }

    static long rowBytes(Map<String, Object> row) {
        return row.values().stream().mapToLong(JdbcLobReader::retainedBytes).sum();
    }

    private static String label(TableMapping table) {
        return MappingIndex.label(table);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
