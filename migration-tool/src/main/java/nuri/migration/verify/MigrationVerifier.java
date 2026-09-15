package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.identity.JdbcTypedValueCodec;
import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.MigrationStateStore;
import nuri.migration.state.RowChecksum;
import nuri.migration.verify.MigrationReport.Status;
import nuri.migration.verify.MigrationReport.TableReport;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.jdbc.core.SqlTypeValue;
import org.springframework.jdbc.core.StatementCreatorUtils;
import org.springframework.jdbc.support.JdbcUtils;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/**
 * 이관 후 실증 검증 — 타깃을 재조회해 조회↔변환↔기록 정합과 실제 타깃 행수를 대조하고 PASS/WARN/FAIL 등급을 매긴다.
 *
 * <p>재설계(2026-07-23): 18줄 카운트-에코 stub 을 실측 검증으로 대체. 등급 규칙 —
 * FAIL: 오류 존재 · (commit) 기록≠변환(쓰기 유실) · (commit) 타깃 실측행 &lt; 기록(유령 기록).
 * WARN: 변환≠조회(행 드롭/증폭; strict CLI에서는 실패 종료). PASS: 조회==변환==기록 & 오류 0.
 *
 * <p>남은 로드맵(설계문서 §7 P4): 고아 FK/NOT-NULL/UNIQUE 스캔, meta_standard_domains 도메인 적합성,
 * 집계 체크섬 parity와 샘플 N행 소스↔타깃 diff.
 */
@Component
public class MigrationVerifier {

    private static final int VERIFY_BATCH = 500;
    private static final int RUNTIME_KEY_MAX = 256;

    private final JdbcTypedValueCodec identityCodec = new JdbcTypedValueCodec();

    /** 판정 분기 단위 테스트용: 실제 실행 경로는 반드시 선언 spec까지 전달하는 public overload를 사용한다. */
    MigrationReport verify(List<TableResult> results, JdbcTemplate targetJt) {
        List<MappingSpec.TableMapping> expected = results == null ? List.of() : results.stream()
                .map(result -> new MappingSpec.TableMapping(
                        result.sourceTable(), result.targetTable(), null, List.of(), null))
                .toList();
        return verify(new MappingSpec(null, null, expected, Map.of()), results, targetJt);
    }

    public MigrationReport verify(MappingSpec spec, List<TableResult> results, JdbcTemplate targetJt) {
        boolean commit = targetJt != null;
        List<TableResult> actualResults = results == null ? List.of() : results;
        List<TableReport> tables = new ArrayList<>(actualResults.size() + 1);
        Status overall = Status.PASS;

        String resultContractError = resultContractError(spec, actualResults);
        if (resultContractError != null) {
            tables.add(new TableReport("<execution-contract>", "<execution-contract>",
                    0L, 0L, 0L, 1L, -1L, Status.FAIL, resultContractError));
            overall = Status.FAIL;
        }

        for (TableResult r : actualResults) {
            MappingSpec.TableMapping mapping = findMapping(spec, r);
            ScopedVerification scoped = commit && spec != null && spec.run() != null
                    ? verifyScoped(targetJt, spec, mapping, r)
                    : null;
            long targetRows = !commit ? -1L
                    : scoped == null ? targetRowCount(targetJt, r.targetTable()) : scoped.rows();
            Status status;
            String note;

            if (!r.errors().isEmpty()) {
                status = Status.FAIL;
                note = "오류 " + r.errors().size() + "건";
            } else if (scoped != null && scoped.error() != null) {
                status = Status.FAIL;
                note = scoped.error();
            } else if (commit && targetRows < 0) {
                status = Status.FAIL;
                note = "타깃 행수 대조 실패 — 성공을 증명할 수 없음";
            } else if (commit && targetRows >= 0 && targetRows < r.written()) {
                status = Status.FAIL;
                note = "타깃 실측행(" + targetRows + ") < 기록(" + r.written() + ") — 유령 기록";
            } else if (commit && r.written() != r.transformed()) {
                status = Status.FAIL;
                note = "기록(" + r.written() + ") ≠ 변환(" + r.transformed() + ") — 쓰기 유실";
            } else if (r.transformed() != r.read()) {
                status = Status.WARN;
                note = "변환(" + r.transformed() + ") ≠ 조회(" + r.read()
                        + ") — 행 드롭/증폭 cardinality 불일치";
            } else if (!commit) {
                status = Status.PASS;
                note = "dry-run(타깃 미대조)";
            } else {
                status = Status.PASS;
                note = "";
            }

            tables.add(new TableReport(r.sourceTable(), r.targetTable(),
                    r.read(), r.transformed(), r.written(), r.errors().size(), targetRows, status, note));
            overall = worst(overall, status);
        }
        if (commit && spec != null && spec.run() != null) {
            try {
                new MigrationStateStore(spec.run()).mark(
                        targetJt, overall == Status.PASS ? "COMPLETED" : "FAILED");
            } catch (RuntimeException e) {
                tables.add(new TableReport("<run-audit>", "<run-audit>",
                        0L, 0L, 0L, 1L, -1L, Status.FAIL,
                        "run 상태 기록 실패 — 검증 완료를 증명할 수 없음"));
                overall = Status.FAIL;
            }
        }
        return new MigrationReport(tables, overall);
    }

    private record ScopedVerification(long rows, String error) {}

    private static MappingSpec.TableMapping findMapping(MappingSpec spec, TableResult result) {
        if (spec == null) {
            return null;
        }
        return spec.tables().stream()
                .filter(table -> identity(table.source(), table.target())
                        .equals(identity(result.sourceTable(), result.targetTable())))
                .findFirst()
                .orElse(null);
    }

    private ScopedVerification verifyScoped(JdbcTemplate target, MappingSpec spec,
                                             MappingSpec.TableMapping table, TableResult result) {
        if (table == null) {
            return new ScopedVerification(-1L, "run scoped 검증 매핑을 찾을 수 없음");
        }
        List<MigrationStateStore.CheckpointEntry> checkpoints;
        try {
            checkpoints = MigrationStateStore.read(target, spec.run(), table.source());
        } catch (RuntimeException e) {
            return new ScopedVerification(-1L, "run scoped checkpoint 대조 실패 — 성공을 증명할 수 없음");
        }
        if (checkpoints.size() != result.written()) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped parity 불일치: checkpoint=" + checkpoints.size()
                            + ", written=" + result.written());
        }

        if (table.identity() != null) {
            return verifyTypedScoped(target, table, checkpoints);
        }

        List<String> columns = EtlExecutor.canonicalTargetColumns(table);
        String targetKey = EtlExecutor.targetIdentityColumn(table);
        if (targetKey == null || targetKey.isBlank() || columns.isEmpty()) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped checksum 계약(target identity/columns) 부재");
        }
        long distinctTargetKeys = checkpoints.stream()
                .map(MigrationStateStore.CheckpointEntry::targetKey)
                .distinct()
                .count();
        if (distinctTargetKeys != checkpoints.size()) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped parity 불일치: checkpoint target key 중복");
        }
        String selectPrefix = "SELECT " + String.join(", ", columns.stream()
                .map(SourceIntrospector::ident).toList())
                + " FROM " + SourceIntrospector.qualifiedIdent(table.target())
                + " WHERE " + SourceIntrospector.ident(targetKey) + " IN (";
        for (int from = 0; from < checkpoints.size(); from += VERIFY_BATCH) {
            List<MigrationStateStore.CheckpointEntry> batch = checkpoints.subList(
                    from, Math.min(from + VERIFY_BATCH, checkpoints.size()));
            try {
                String placeholders = String.join(", ", batch.stream().map(ignored -> "?").toList());
                Object[] arguments = batch.stream()
                        // 레거시 checkpoint는 키를 문자열로 보존한다. PostgreSQL의 bigint/UUID 키와
                        // varchar 파라미터를 비교하면 operator 오류가 나므로 서버의 컬럼 타입 추론을 쓴다.
                        // 복합 typed identity는 아래 전용 경계에서 원래 JDBC 타입으로 바인딩한다.
                        .map(checkpoint -> new SqlParameterValue(Types.OTHER, checkpoint.targetKey()))
                        .toArray();
                TargetBatch rows = readTargetChecksums(target,
                        selectPrefix + placeholders + ")", arguments, columns, row -> {
                            Object actualKey = valueIgnoreCase(row, targetKey);
                            return actualKey == null ? null : actualKey.toString();
                        });
                if (rows.missingIdentity()) {
                    return new ScopedVerification(checkpoints.size(),
                            "run scoped target identity가 null: " + targetKey);
                }
                for (MigrationStateStore.CheckpointEntry checkpoint : batch) {
                    TargetRowSummary matched = rows.byKey().get(checkpoint.targetKey());
                    long matches = matched == null ? 0 : matched.count();
                    if (matches != 1) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped parity 불일치: targetDigest=" + keyDigest(checkpoint.targetKey())
                                        + " 행수=" + matches);
                    }
                    if (!matched.checksum().equals(checkpoint.rowChecksum())) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped checksum 불일치: sourceDigest=" + keyDigest(checkpoint.sourceKey()));
                    }
                }
            } catch (RuntimeException e) {
                return new ScopedVerification(checkpoints.size(),
                        "run scoped target/checksum batch 대조 실패");
            }
        }
        return new ScopedVerification(checkpoints.size(), null);
    }

    private ScopedVerification verifyTypedScoped(
            JdbcTemplate target,
            MappingSpec.TableMapping table,
            List<MigrationStateStore.CheckpointEntry> checkpoints
    ) {
        List<String> columns = EtlExecutor.canonicalTargetColumns(table);
        List<IdentityComponentSpec> components = table.identity().targetComponents();
        if (columns.isEmpty() || components.isEmpty()) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped checksum 계약(typed target identity/columns) 부재");
        }

        List<TypedCheckpoint> typed = new ArrayList<>(checkpoints.size());
        try {
            for (MigrationStateStore.CheckpointEntry checkpoint : checkpoints) {
                if (!TypedKeyEncoding.isTyped(checkpoint.targetKey())) {
                    return new ScopedVerification(checkpoints.size(),
                            "run scoped typed target key가 versioned encoding이 아님");
                }
                TypedKeyTuple tuple = TypedKeyEncoding.decode(checkpoint.targetKey());
                requireTupleContract(tuple, components);
                typed.add(new TypedCheckpoint(checkpoint, tuple));
            }
        } catch (RuntimeException e) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped typed target key 계약 불일치");
        }

        long distinctTargetKeys = checkpoints.stream()
                .map(MigrationStateStore.CheckpointEntry::targetKey)
                .distinct()
                .count();
        if (distinctTargetKeys != checkpoints.size()) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped parity 불일치: checkpoint target key 중복");
        }

        String selectPrefix;
        try {
            selectPrefix = "SELECT " + String.join(", ", columns.stream()
                    .map(SourceIntrospector::ident).toList())
                    + " FROM " + SourceIntrospector.qualifiedIdent(table.target())
                    + " WHERE ";
        } catch (IllegalArgumentException e) {
            return new ScopedVerification(checkpoints.size(),
                    "run scoped typed target identifier 계약 불일치");
        }

        for (int from = 0; from < typed.size(); from += VERIFY_BATCH) {
            List<TypedCheckpoint> batch = typed.subList(
                    from, Math.min(from + VERIFY_BATCH, typed.size()));
            try {
                Object[] arguments = batch.stream()
                        .flatMap(item -> item.target().values().stream())
                        .map(TypedValue::jdbcValue)
                        .toArray();
                TargetBatch rows = readTargetChecksums(target,
                        selectPrefix + typedTuplePredicate(components, batch.size()), arguments,
                        columns, row -> TypedKeyEncoding.encode(tupleFromRow(row, components),
                                RUNTIME_KEY_MAX, "tb_migration_checkpoint.target_key"));
                for (TypedCheckpoint item : batch) {
                    MigrationStateStore.CheckpointEntry checkpoint = item.checkpoint();
                    TargetRowSummary matched = rows.byKey().get(checkpoint.targetKey());
                    long matches = matched == null ? 0 : matched.count();
                    if (matches != 1) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped parity 불일치: targetDigest=" + keyDigest(checkpoint.targetKey())
                                        + " 행수=" + matches);
                    }
                    if (!matched.checksum().equals(checkpoint.rowChecksum())) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped checksum 불일치: sourceDigest=" + keyDigest(checkpoint.sourceKey()));
                    }
                }
            } catch (RuntimeException e) {
                return new ScopedVerification(checkpoints.size(),
                        "run scoped typed target/checksum batch 대조 실패");
            }
        }
        return new ScopedVerification(checkpoints.size(), null);
    }

    /** Keep only identity/count/checksum per batch; large target values live for one row. */
    private static TargetBatch readTargetChecksums(
            JdbcTemplate target, String sql, Object[] arguments, List<String> columns,
            Function<Map<String, Object>, String> identity
    ) {
        return target.execute((ConnectionCallback<TargetBatch>) connection -> {
            boolean ownTransaction = connection.getAutoCommit();
            boolean previousReadOnly = connection.isReadOnly();
            boolean transactionStarted = false;
            try {
                if (ownTransaction) {
                    connection.setReadOnly(true);
                    connection.setAutoCommit(false);
                    transactionStarted = true;
                }
                // pgjdbc needs autoCommit=false and a positive fetch size to use a cursor.
                try (PreparedStatement statement = connection.prepareStatement(sql,
                        ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)) {
                    statement.setFetchSize(1);
                    for (int i = 0; i < arguments.length; i++) {
                        Object argument = arguments[i];
                        if (argument instanceof SqlParameterValue parameter) {
                            StatementCreatorUtils.setParameterValue(statement, i + 1,
                                    parameter, parameter.getValue());
                        } else {
                            StatementCreatorUtils.setParameterValue(statement, i + 1,
                                    SqlTypeValue.TYPE_UNKNOWN, argument);
                        }
                    }
                    try (ResultSet result = statement.executeQuery()) {
                        ResultSetMetaData metadata = result.getMetaData();
                        Map<String, TargetRowSummary> summaries = new LinkedHashMap<>();
                        while (result.next()) {
                            Map<String, Object> row = new LinkedHashMap<>();
                            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                                row.putIfAbsent(JdbcUtils.lookupColumnName(metadata, i),
                                        JdbcUtils.getResultSetValue(result, i));
                            }
                            String key = identity.apply(row);
                            if (key == null) {
                                return new TargetBatch(summaries, true);
                            }
                            String checksum = RowChecksum.calculate(columns, row);
                            summaries.compute(key, (ignored, previous) -> previous == null
                                    ? new TargetRowSummary(1, checksum)
                                    : new TargetRowSummary(previous.count() + 1, previous.checksum()));
                        }
                        return new TargetBatch(summaries, false);
                    }
                }
            } finally {
                // A caller-owned transaction is never committed, rolled back, or reconfigured.
                if (ownTransaction) {
                    if (transactionStarted) {
                        connection.rollback();
                        connection.setAutoCommit(true);
                    }
                    connection.setReadOnly(previousReadOnly);
                }
            }
        });
    }

    private record TargetRowSummary(long count, String checksum) {}

    private record TargetBatch(Map<String, TargetRowSummary> byKey, boolean missingIdentity) {}

    private record TypedCheckpoint(
            MigrationStateStore.CheckpointEntry checkpoint,
            TypedKeyTuple target
    ) {}

    private void requireTupleContract(
            TypedKeyTuple tuple,
            List<IdentityComponentSpec> components
    ) {
        if (tuple.values().size() != components.size()) {
            throw new IllegalArgumentException("typed target identity arity 불일치");
        }
        for (int i = 0; i < components.size(); i++) {
            TypedValue value = tuple.values().get(i);
            if (value.isNull()) {
                throw new IllegalArgumentException("typed target identity null component 금지");
            }
            TypedValue declared = identityCodec.encode(components.get(i).type(), value.jdbcValue());
            if (!declared.equals(value)) {
                throw new IllegalArgumentException("typed target identity type 불일치: "
                        + components.get(i).column());
            }
        }
    }

    private TypedKeyTuple tupleFromRow(
            Map<String, Object> row,
            List<IdentityComponentSpec> components
    ) {
        List<TypedValue> values = new ArrayList<>(components.size());
        for (IdentityComponentSpec component : components) {
            Object value = valueIgnoreCase(row, component.column());
            if (value == null) {
                throw new IllegalStateException("run scoped target identity가 null: " + component.column());
            }
            values.add(identityCodec.encode(component.type(), value));
        }
        return TypedKeyTuple.of(values.toArray(TypedValue[]::new));
    }

    static String typedTuplePredicate(List<IdentityComponentSpec> components, int tupleCount) {
        if (components == null || components.isEmpty()) {
            throw new IllegalArgumentException("typed target identity components must not be empty");
        }
        if (tupleCount <= 0) {
            throw new IllegalArgumentException("typed tuple predicate count must be positive");
        }
        String tuple = "(" + String.join(" AND ", components.stream()
                .map(component -> SourceIntrospector.ident(component.column()) + " = ?")
                .toList()) + ")";
        return "(" + String.join(" OR ", java.util.Collections.nCopies(tupleCount, tuple)) + ")";
    }

    private static Object valueIgnoreCase(Map<String, Object> row, String column) {
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(column)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private static String resultContractError(MappingSpec spec, List<TableResult> results) {
        List<MappingSpec.TableMapping> expectedTables = spec == null ? List.of() : spec.tables();
        if (expectedTables.isEmpty()) {
            return "검증 대상 테이블 매핑이 비어 있어 성공을 증명할 수 없음";
        }
        Map<String, Long> expected = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : expectedTables) {
            expected.merge(identity(table.source(), table.target()), 1L, Long::sum);
        }
        Map<String, Long> actual = new LinkedHashMap<>();
        for (TableResult result : results) {
            actual.merge(identity(result.sourceTable(), result.targetTable()), 1L, Long::sum);
        }
        if (expectedTables.size() != results.size() || !expected.equals(actual)) {
            return "실행 결과 cardinality/identity 불일치: expected=" + expected + ", actual=" + actual;
        }
        return null;
    }

    private static String identity(String source, String target) {
        return normalize(source) + " -> " + normalize(target);
    }

    private static String normalize(String value) {
        return value == null ? "<null>" : value.toLowerCase(Locale.ROOT);
    }

    private long targetRowCount(JdbcTemplate jt, String table) {
        try {
            Long c = jt.queryForObject("SELECT count(*) FROM " + SourceIntrospector.qualifiedIdent(table), Long.class);
            return c == null ? 0L : c;
        } catch (RuntimeException e) {
            return -1L; // 호출자는 대조 불가를 FAIL로 판정한다.
        }
    }

    private static String keyDigest(String key) {
        if (key == null) {
            return "<null>";
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(key.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static Status worst(Status a, Status b) {
        if (a == Status.FAIL || b == Status.FAIL) {
            return Status.FAIL;
        }
        if (a == Status.WARN || b == Status.WARN) {
            return Status.WARN;
        }
        return Status.PASS;
    }
}
