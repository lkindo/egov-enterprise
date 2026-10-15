package nuri.migration.verify;

import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.identity.JdbcTypedValueCodec;
import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.isolate.IsolationTally;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ArchiveDump;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.KeyDiagnostics;
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

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * 이관 후 실증 검증 — 타깃을 재조회해 조회↔변환↔기록 정합과 실제 타깃 행수를 대조하고 PASS/WARN/FAIL 등급을 매긴다.
 *
 * <p>재설계(2026-07-23): 18줄 카운트-에코 stub 을 실측 검증으로 대체. 등급 규칙 —
 * FAIL: 오류 존재 · (commit) 기록≠변환(쓰기 유실) · (commit) 타깃 실측행 &lt; 기록(유령 기록).
 * WARN: 변환≠조회(행 드롭/증폭; strict CLI에서는 실패 종료). PASS: 조회==변환==기록 & 오류 0.
 *
 * <p>[ADR-0029 L3b] 승인 격리가 있으면 조회 = 변환 + 격리여야 하고(어긋나면 FAIL), 격리 집계가 mapping 의 isolate
 * 선언(원장 행·컬럼·위반, 원장 행마다 상한)과 맞아야 한다. 기록 = 변환은 그대로다.
 *
 * <p>[ADR-0029 L3e] 보관 덤프의 행 수는 그 표의 조회 수와 같아야 하고(재개로 건너뛴 행·격리한 행 포함), 선언한 덤프가 모두
 * 있어야 하며, COMMIT 에서 격리한 행의 키는 반출돼야 한다. 어긋나면 {@code <archives>} 행이 FAIL 이다.
 *
 * <p>남은 로드맵(설계문서 §7 P4): 고아 FK/NOT-NULL/UNIQUE 스캔, meta_standard_domains 도메인 적합성,
 * 집계 체크섬 parity와 샘플 N행 소스↔타깃 diff.
 */
@Component
public class MigrationVerifier {

    private static final int VERIFY_BATCH = 500;
    /** 보관 덤프·격리 키 반출 판정의 보고 행 이름(ADR-0029 L3e). */
    static final String ARCHIVES = "<archives>";
    private static final int RUNTIME_KEY_MAX = 256;

    private final JdbcTypedValueCodec identityCodec = new JdbcTypedValueCodec();

    /** 판정 분기 단위 테스트용: 실제 실행 경로는 반드시 선언 spec까지 전달하는 public overload를 사용한다. */
    MigrationReport verify(List<TableResult> results, JdbcTemplate targetJt) {
        List<MappingSpec.TableMapping> expected = results == null ? List.of() : results.stream()
                .map(result -> new MappingSpec.TableMapping(
                        result.sourceTable(), result.targetTable(), null, null, List.of(), null, List.of(), null,
                        null, List.of(), result.mappingId()))
                .toList();
        return verify(new MappingSpec(null, null, expected, Map.of()), results, targetJt);
    }

    /**
     * 보관 덤프 결과 없이 검증한다. mapping 에 보관 선언이 있으면 덤프를 증명할 수 없으므로 FAIL 이다(ADR-0029 L3e) — 승인
     * workflow 는 {@link #verify(MappingSpec, List, JdbcTemplate, ArchiveOutcome)} 를 쓴다.
     */
    public MigrationReport verify(MappingSpec spec, List<TableResult> results, JdbcTemplate targetJt) {
        return verify(spec, results, targetJt, null);
    }

    /**
     * {@code archives} 는 같은 실행의 보관 덤프·격리 키 반출 결과다(ADR-0029 L3e). 덤프 행 수가 그 표의 조회 수와 같고,
     * 선언한 덤프가 모두 있고, COMMIT 에서 격리한 행의 키가 반출됐는지 함께 본다.
     */
    public MigrationReport verify(MappingSpec spec, List<TableResult> results, JdbcTemplate targetJt,
                                  ArchiveOutcome archives) {
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
            String isolationError = isolationError(mapping, r);
            Status status;
            String note;

            if (!r.errors().isEmpty()) {
                status = Status.FAIL;
                // [2026-10-13 DEC-OPS-309] 첫 오류를 함께 보인다. 실행기 오류 문구는 테이블·컬럼·행 순번·고정 코드와,
                //   재개 대조 오류의 키 digest(KeyDiagnostics — 이 프로세스에서만 쓰는 무작위 키의 HMAC)뿐이다.
                note = "오류 " + r.errors().size() + "건 — 첫 오류: " + r.errors().getFirst();
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
            } else if (isolationError != null) {
                status = Status.FAIL;
                note = isolationError;
            } else if (r.isolated() > 0 && r.transformed() + r.isolated() != r.read()) {
                // [ADR-0029 L3b] 격리한 행은 적재하지 않았을 뿐 읽은 행이다. 합이 어긋나면 어느 행이 사라졌는지 증명할 수 없다.
                status = Status.FAIL;
                note = "조회(" + r.read() + ") ≠ 변환(" + r.transformed() + ") + 격리(" + r.isolated()
                        + ") — 격리 집계 불일치";
            } else if (r.transformed() + r.isolated() != r.read()) {
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
                    r.read(), r.transformed(), r.written(), r.errors().size(), targetRows, status, note,
                    r.mappingId(), r.isolated()));
            overall = worst(overall, status);
        }
        String archiveError = archiveError(spec, actualResults, archives, commit);
        if (archiveError != null) {
            tables.add(new TableReport(ARCHIVES, ARCHIVES, 0L, 0L, 0L, 1L, -1L, Status.FAIL, archiveError));
            overall = Status.FAIL;
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

    /**
     * [ADR-0029 L3e] 보관 덤프·격리 키 반출이 실행과 맞는지 본다. 맞으면 null. 문구는 보관 id·표 이름·건수·고정 사유뿐이다.
     *
     * <ul>
     *   <li>보관 선언이 있으면 결과가 있어야 하고, 덤프·반출 실패가 없어야 한다.</li>
     *   <li>COMMIT 에 보관 선언이나 isolate 가 있으면 파일을 썼어야 하고, dry-run 은 파일을 쓰지 않는다.</li>
     *   <li>선언한 덤프마다 결과가 정확히 하나이고 보존 기한·원장 행이 선언과 같다. 덤프 행 수 = 그 읽기의 행 수이고, 매핑된
     *       표는 그 수가 보관을 읽는 매핑의 조회 수와 같다(분할한 소스는 그 매핑의 where 가 모든 매핑의 행을 덮어야 한다).
     *       COMMIT 덤프는 파일 이름·바이트·SHA-256 이 있다.</li>
     *   <li>COMMIT 에서 격리한 행이 있는 표마다 반출이 하나이고 반출 행 수 = 격리 수다. 격리하지 않은 표의 반출은 없다.</li>
     * </ul>
     */
    static String archiveError(MappingSpec spec, List<TableResult> results, ArchiveOutcome archives,
                               boolean commit) {
        List<ArchiveDump> declared = spec == null ? List.of() : spec.archives();
        boolean required = spec != null && ArchiveRun.required(spec);
        if (archives == null) {
            return declared.isEmpty() ? null : "보관 선언이 있는데 보관 덤프 결과가 없음 — 덤프를 증명할 수 없음";
        }
        if (!archives.errors().isEmpty()) {
            return "보관 덤프·격리 키 반출 실패 — " + archives.errors().getFirst();
        }
        if (commit && required && !archives.writesFiles()) {
            return "보관 디렉터리 없이 적재함 — 덤프·격리 키를 증명할 수 없음";
        }
        if (!commit && archives.writesFiles()) {
            return "dry-run 이 보관 파일을 씀";
        }
        Map<String, ArchiveOutcome.Dumped> byId = new LinkedHashMap<>();
        for (ArchiveOutcome.Dumped dumped : archives.dumps()) {
            if (byId.put(dumped.id(), dumped) != null) {
                return "보관 덤프 결과가 두 번 있음: " + dumped.id();
            }
        }
        for (ArchiveDump dump : declared) {
            ArchiveOutcome.Dumped dumped = byId.remove(dump.id());
            if (dumped == null) {
                return "보관 덤프 결과 없음: " + dump.id();
            }
            if (!Objects.equals(dumped.retainUntil(), dump.retainUntil())
                    || !dumped.ledgerEntries().equals(dump.ledgerEntries())) {
                return "보관 덤프 결과가 선언(보존 기한·원장 행)과 다름: " + dump.id();
            }
            if (dumped.rows() != dumped.sourceRows()) {
                return "보관 덤프 행(" + dumped.rows() + ") ≠ 읽은 행(" + dumped.sourceRows() + "): " + dump.id();
            }
            MappingSpec.TableMapping mapped = spec.mappedTableOf(dump.source());
            if (mapped == null && !dumped.dumpOnly()) {
                return "덤프만 하는 표의 보관이 매핑된 표로 기록됨: " + dump.id();
            }
            if (mapped != null) {
                // [ADR-0029 L3c·L3e] 덤프 행 = 읽는 매핑의 조회는 그 조회가 소스의 모든 매핑이 읽은 행을 덮을 때만 완전하다.
                if (!spec.archiveReaderCoversSource(dump.source())) {
                    return "분할한 소스의 보관이 다른 where 로 나눈 매핑의 행을 덮지 않음: " + dump.id();
                }
                TableResult result = resultOf(results, mapped);
                if (dumped.dumpOnly() || result == null || dumped.sourceRows() != result.read()) {
                    return "보관 덤프 행(" + dumped.rows() + ") ≠ 조회(" + (result == null ? "-" : result.read())
                            + "): " + dump.id();
                }
            }
            if (archives.writesFiles()
                    ? dumped.fileName() == null || dumped.bytes() <= 0 || dumped.sha256() == null
                            || !dumped.sha256().matches("[0-9a-f]{64}")
                    : dumped.fileName() != null) {
                return "보관 덤프 파일 증거가 모드와 맞지 않음: " + dump.id();
            }
        }
        if (!byId.isEmpty()) {
            return "선언하지 않은 보관 덤프: " + byId.keySet().iterator().next();
        }
        Map<String, ArchiveOutcome.KeyExport> exports = new LinkedHashMap<>();
        for (ArchiveOutcome.KeyExport export : archives.keyExports()) {
            if (!archives.writesFiles() || exports.put(normalize(export.source()), export) != null) {
                return "격리 키 반출이 모드와 맞지 않거나 두 번 있음: " + export.source();
            }
        }
        if (!archives.writesFiles()) {
            return null;
        }
        for (TableResult result : results) {
            ArchiveOutcome.KeyExport export = exports.remove(normalize(result.sourceTable()));
            if (result.isolated() > 0 && (export == null || export.rows() != result.isolated()
                    || export.fileName() == null || export.sha256() == null
                    || !export.sha256().matches("[0-9a-f]{64}"))) {
                return "격리 키 반출(" + (export == null ? 0 : export.rows()) + ") ≠ 격리(" + result.isolated()
                        + "): " + result.sourceTable();
            }
            if (result.isolated() == 0 && export != null) {
                return "격리하지 않은 표의 격리 키 반출: " + result.sourceTable();
            }
        }
        if (!exports.isEmpty()) {
            return "실행 결과에 없는 표의 격리 키 반출: " + exports.values().iterator().next().source();
        }
        return null;
    }

    /** 이 매핑의 결과 — 소스와 매핑 id 가 같아야 한다(ADR-0029 L3c, 기본 매핑은 id 가 null). */
    private static TableResult resultOf(List<TableResult> results, MappingSpec.TableMapping mapping) {
        for (TableResult result : results) {
            if (normalize(result.sourceTable()).equals(normalize(mapping.source()))
                    && Objects.equals(result.mappingId(), mapping.id())) {
                return result;
            }
        }
        return null;
    }

    /**
     * [ADR-0029 L3b] 격리 집계가 mapping 의 isolate 선언과 맞는지 본다. 격리 무리는 선언한 (원장 행, 컬럼, 위반)뿐이고, 무리의
     * 행 수는 순번 수와 같고, 순번은 1..조회 안이며, 원장 행마다 격리한 행(순번의 합집합)이 그 상한 이하이고, 모든 순번의
     * 합집합이 격리 행 수와 같아야 한다. 맞으면 null. 문구는 원장 행 ID·컬럼·코드·건수만 담는다.
     */
    private static String isolationError(MappingSpec.TableMapping mapping, TableResult result) {
        if (result.isolated() < 0) {
            return "격리 행 수가 음수 — 격리 집계를 증명할 수 없음";
        }
        if (result.isolated() == 0 && result.isolations().isEmpty()) {
            return null;
        }
        if (mapping == null) {
            return "격리 집계를 대조할 매핑을 찾을 수 없음";
        }
        Map<String, Long> caps;
        try {
            caps = RowIsolationPolicy.of(mapping).caps();
        } catch (IllegalArgumentException invalid) {
            return "isolate 선언이 올바르지 않아 격리 집계를 증명할 수 없음";
        }
        Map<String, Set<Long>> rowsByEntry = new LinkedHashMap<>();
        Set<Long> all = new HashSet<>();
        for (IsolationTally.Isolation isolation : result.isolations()) {
            if (!declared(mapping, isolation)) {
                return "선언하지 않은 격리: 원장 행 " + isolation.ledgerEntry() + ", " + isolation.column() + ", "
                        + isolation.violation();
            }
            if (isolation.rows() != isolation.ordinals().size()) {
                return "격리 행 수와 순번 수가 다름: 원장 행 " + isolation.ledgerEntry();
            }
            for (Long ordinal : isolation.ordinals()) {
                if (ordinal == null || ordinal < 1 || ordinal > result.read()) {
                    return "격리 행 순번이 조회 범위 밖: 원장 행 " + isolation.ledgerEntry();
                }
                rowsByEntry.computeIfAbsent(isolation.ledgerEntry(), ignored -> new HashSet<>()).add(ordinal);
                all.add(ordinal);
            }
        }
        for (Map.Entry<String, Set<Long>> entry : rowsByEntry.entrySet()) {
            long cap = caps.get(entry.getKey());
            if (entry.getValue().size() > cap) {
                return "격리 상한 초과(원장 행 " + entry.getKey() + ", 상한 " + cap + "): 격리 "
                        + entry.getValue().size() + "행";
            }
        }
        if (all.size() != result.isolated()) {
            return "격리 행 수(" + result.isolated() + ") ≠ 격리 순번(" + all.size() + ") — 격리 집계 불일치";
        }
        return null;
    }

    /** 격리 무리가 mapping 컬럼의 isolate(같은 원장 행, 그 위반 포함)에 선언돼 있는가. */
    private static boolean declared(MappingSpec.TableMapping mapping, IsolationTally.Isolation isolation) {
        for (MappingSpec.ColumnMapping column : mapping.columns()) {
            MappingSpec.Isolate isolate = column.isolate();
            if (isolate != null && column.target() != null && column.target().equalsIgnoreCase(isolation.column())
                    && isolate.ledgerEntry() != null && isolate.ledgerEntry().equals(isolation.ledgerEntry())
                    && isolate.violations().contains(isolation.violation())) {
                return true;
            }
        }
        return false;
    }

    private static MappingSpec.TableMapping findMapping(MappingSpec spec, TableResult result) {
        if (spec == null) {
            return null;
        }
        return spec.tables().stream()
                .filter(table -> identity(table.source(), table.id(), table.target())
                        .equals(identity(result.sourceTable(), result.mappingId(), result.targetTable())))
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
            checkpoints = MigrationStateStore.read(target, spec.run(), table.source(), table.effectiveId());
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
                    if (matched == null || matches != 1) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped parity 불일치: targetDigest=" + KeyDiagnostics.digest(checkpoint.targetKey())
                                        + " 행수=" + matches);
                    }
                    if (!matched.checksum().equals(checkpoint.rowChecksum())) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped checksum 불일치: sourceDigest=" + KeyDiagnostics.digest(checkpoint.sourceKey()));
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
                    if (matched == null || matches != 1) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped parity 불일치: targetDigest=" + KeyDiagnostics.digest(checkpoint.targetKey())
                                        + " 행수=" + matches);
                    }
                    if (!matched.checksum().equals(checkpoint.rowChecksum())) {
                        return new ScopedVerification(checkpoints.size(),
                                "run scoped checksum 불일치: sourceDigest=" + KeyDiagnostics.digest(checkpoint.sourceKey()));
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
            expected.merge(identity(table.source(), table.id(), table.target()), 1L, Long::sum);
        }
        Map<String, Long> actual = new LinkedHashMap<>();
        for (TableResult result : results) {
            actual.merge(identity(result.sourceTable(), result.mappingId(), result.targetTable()), 1L, Long::sum);
        }
        if (expectedTables.size() != results.size() || !expected.equals(actual)) {
            return "실행 결과 cardinality/identity 불일치: expected=" + expected + ", actual=" + actual;
        }
        return null;
    }

    /** 결과와 매핑을 잇는 식별 — 소스·매핑 id(ADR-0029 L3c, 기본 매핑은 생략)·대상. */
    private static String identity(String source, String mappingId, String target) {
        String mapping = mappingId == null || mappingId.isEmpty() ? "" : "#" + mappingId;
        return normalize(source) + mapping + " -> " + normalize(target);
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
