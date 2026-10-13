package nuri.migration.etl;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.identity.JdbcTypedValueCodec;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.keymap.KeyMapRegistry.Checkpoint;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.protect.ColumnProtector;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.KeyDiagnostics;
import nuri.migration.state.MigrationStateStore;
import nuri.migration.state.MigrationStateStore.CheckpointEntry;
import nuri.migration.state.RowChecksum;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * ETL 실행기 — FK 위상정렬 → 스트리밍(keyset-fetch) 소스 조회 → 컬럼 매핑/코드맵/변환/타입강제/키맵 재작성 →
 * 배치·트랜잭션 타깃 적재.
 *
 * <p>재설계(2026-07-23): 기존 SKELETON(전량 메모리 로드 · 행단위 autocommit · 死 type/idStrategy · 무순서)을
 * 다음으로 대체했다 — (1) {@link TableOrderer} 위상정렬로 부모 먼저, (2) 복합키 keyset page로 메모리 상한,
 * (3) {@link TypeConverter}로 {@code type} 활성화, (4) {@link KeyMapRegistry}로 {@code idStrategy} 채번 +
 * {@code fkRef} FK 번역(참조 무결성), (5) JDBC 배치 + 청크 트랜잭션(배치 실패 시 행단위 폴백으로 오류 격리).
 *
 * <p>[2026-10-13 DEC-OPS-309] 행 변환(transform·codemap·type·fkRef·identity) 실패는 격리하지 않는다 —
 * 그 chunk 를 쓰지 않고 테이블과 run 을 멈춘다. 행단위 폴백은 쓰기(제약 위반) 실패에만 남는다 — 길이·NOT NULL·
 * CHECK 위반 행은 빠지고 나머지는 커밋되는 승인 없는 부분 커밋이며 GAP-ETL-001 이 추적한다.
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
    private final JdbcTypedValueCodec identityCodec = new JdbcTypedValueCodec();
    /** 보호 컬럼 암호화 키를 주는 환경(DEC-OPS-308). 키는 이 경계로만 들어오고 어디에도 기록하지 않는다. */
    private final Function<String, String> environment;

    @Autowired
    public EtlExecutor(SourceIntrospector introspector, TransformerRegistry transformers) {
        this(introspector, transformers, System::getenv);
    }

    /** 시험과 승인된 secret provider adapter 가 같은 키 경계를 쓴다. */
    public EtlExecutor(SourceIntrospector introspector, TransformerRegistry transformers,
                       Function<String, String> environment) {
        this.introspector = introspector;
        this.transformers = transformers;
        this.environment = Objects.requireNonNull(environment, "environment");
    }

    /**
     * 테이블별 적재 결과. {@code sequenceResets} 는 원본 키를 쓴 컬럼의 시퀀스 재설정 기록이다(DEC-OPS-306) —
     * 이름과 결과만 담고 키 값은 담지 않는다.
     */
    public record TableResult(String sourceTable, String targetTable,
                              long read, long transformed, long written, List<String> errors,
                              List<TargetSequenceSynchronizer.SequenceReset> sequenceResets) {

        public TableResult {
            sequenceResets = sequenceResets == null ? List.of() : List.copyOf(sequenceResets);
        }

        /** 시퀀스 재설정 기록 도입 전 생성자 호환. */
        public TableResult(String sourceTable, String targetTable,
                           long read, long transformed, long written, List<String> errors) {
            this(sourceTable, targetTable, read, transformed, written, errors, List.of());
        }
    }

    public List<TableResult> execute(MappingSpec spec, MigrationMode mode) {
        if (spec == null) {
            throw new IllegalArgumentException("mapping spec이 없습니다.");
        }
        JdbcTemplate sourceJt = spec.source() == null ? null : introspector.jdbc(spec.source());
        JdbcTemplate targetJt = spec.target() == null ? null : introspector.jdbc(spec.target());
        return execute(spec, mode, sourceJt, targetJt);
    }

    /** workflow가 소유하는 source endpoint를 재생성하지 않고 그대로 사용하는 실행 경계. */
    public List<TableResult> execute(
            MappingSpec spec,
            MigrationMode mode,
            JdbcTemplate sourceJt,
            JdbcTemplate targetJt
    ) {
        return execute(
                spec,
                mode,
                sourceJt,
                targetJt,
                SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.UNVERIFIED,
                        "legacy execute overload compatibility"),
                true);
    }

    /** adapter가 승인한 정책으로 load 전체를 하나의 source read transaction에 고정한다. */
    public List<TableResult> execute(
            MappingSpec spec,
            MigrationMode mode,
            JdbcTemplate sourceJt,
            JdbcTemplate targetJt,
            SourceReadSessionPolicy sourceReadPolicy,
            boolean sourceFreezeAcknowledged
    ) {
        if (spec == null) {
            throw new IllegalArgumentException("mapping spec이 없습니다.");
        }
        if (spec.source() == null) {
            throw new IllegalArgumentException("mapping.source 접속 설정이 없습니다.");
        }
        if (mode == MigrationMode.COMMIT && spec.target() == null) {
            throw new IllegalArgumentException("commit 모드에는 mapping.target 접속 설정이 필수입니다.");
        }
        requireSourceReadSession(sourceReadPolicy, sourceFreezeAcknowledged);
        boolean commit = mode == MigrationMode.COMMIT;
        if (commit) {
            requireCommitContract(spec);
        }
        // 보호 컬럼 선언 위반·키 부재는 연결을 열거나 실행 상태를 만들기 전에 멈춘다(DEC-OPS-308).
        ColumnProtector protector = ColumnProtector.forRun(spec, environment);
        DataSource sourceDs = requireDataSource(sourceJt, "source JDBC");
        DataSource targetDs = targetJt == null ? null : targetJt.getDataSource();
        if (commit && targetDs == null) {
            throw new IllegalArgumentException("commit 모드에는 target JDBC DataSource가 필수입니다.");
        }
        RunContext run = spec.run();
        KeyMapRegistry registry = commit
                ? new KeyMapRegistry(run.runId(), run.sourceNamespace())
                : new KeyMapRegistry();
        MigrationStateStore state = commit ? new MigrationStateStore(run) : null;

        List<TableResult> results = new ArrayList<>();
        boolean stateInitialized = false;
        try {
            List<TableMapping> orderedTables = TableOrderer.order(spec.tables());
            requireCompositeForeignKeyOrder(orderedTables);
            if (orderedTables.isEmpty()) {
                if (commit) {
                    initializeCommitState(targetJt, registry, state);
                    stateInitialized = true;
                }
            } else {
                // 원본 키를 쓰는 컬럼의 시퀀스를 행을 쓰기 전에 정한다. 정할 수 없으면 여기서 멈춘다(DEC-OPS-306).
                List<TargetSequenceSynchronizer.Target> sequencePlan = commit
                        ? planTargetSequences(targetDs, orderedTables)
                        : List.of();
                boolean tablesRan = false;
                try (Connection sourceConnection = sourceDs.getConnection()) {
                    try {
                        sourceConnection.setReadOnly(true);
                        sourceConnection.setTransactionIsolation(sourceReadPolicy.jdbcIsolation());
                        sourceConnection.setAutoCommit(false);
                        TableResult preflightFailure = commit
                                ? preflightOrderTupleUniqueness(sourceConnection, orderedTables)
                                : null;
                        if (preflightFailure != null) {
                            results.add(preflightFailure);
                            safeRollback(sourceConnection);
                        } else {
                            if (commit) {
                                initializeCommitState(targetJt, registry, state);
                                stateInitialized = true;
                            }
                            boolean sourceSessionFailed = false;
                            tablesRan = true;
                            TableMapping stoppedAt = null;
                            for (TableMapping table : orderedTables) {
                                if (stoppedAt != null) {
                                    // [2026-10-13 DEC-OPS-309] 앞 테이블의 행 변환 실패로 run 을 멈췄다.
                                    //   남은 테이블은 읽지도 쓰지도 않고, 처리하지 않았다는 사실을 결과에 남긴다.
                                    results.add(notProcessed(table, stoppedAt, state));
                                    continue;
                                }
                                TableExecution execution = runTable(
                                        sourceConnection, targetDs, spec, table, registry, state, commit,
                                        protector);
                                results.add(execution.result());
                                if (execution.sourceSessionFailed()) {
                                    sourceSessionFailed = true;
                                    safeRollback(sourceConnection);
                                    break;
                                }
                                if (execution.rowFailureStopped()) {
                                    stoppedAt = table;
                                }
                            }
                            if (!sourceSessionFailed) {
                                sourceConnection.commit();
                            }
                        }
                    } catch (SQLException sourceFailure) {
                        safeRollback(sourceConnection);
                        throw new IllegalStateException("source read session failed", sourceFailure);
                    } catch (Throwable failure) {
                        safeRollback(sourceConnection);
                        throw propagate(failure);
                    }
                }
                if (tablesRan) {
                    // 오류가 난 테이블도 앞선 chunk 는 남으므로 재설정한다. 앞으로만 옮기므로 재실행해도 같다.
                    synchronizeTargetSequences(targetDs, sequencePlan, results);
                }
            }
        } catch (SQLException sourceConnectionFailure) {
            if (stateInitialized) {
                Objects.requireNonNull(state).mark(targetJt, "FAILED");
            }
            throw new IllegalStateException("source read session failed", sourceConnectionFailure);
        } catch (Throwable failure) {
            if (stateInitialized && !isJvmFatal(failure)) {
                Objects.requireNonNull(state).mark(targetJt, "FAILED");
            }
            throw propagate(failure);
        }
        if (registry.hasPending()) {
            throw new IllegalStateException("처리 종료 후 미확정 keymap이 남았습니다 — 이관 결과를 신뢰할 수 없습니다");
        }
        if (stateInitialized) {
            boolean failed = results.stream().anyMatch(result -> !result.errors().isEmpty());
            Objects.requireNonNull(state).mark(targetJt, failed ? "FAILED" : "LOADED");
        }
        return results;
    }

    private static List<TargetSequenceSynchronizer.Target> planTargetSequences(
            DataSource targetDs,
            List<TableMapping> orderedTables
    ) {
        try (Connection target = targetDs.getConnection()) {
            return TargetSequenceSynchronizer.plan(target, orderedTables);
        } catch (SQLException failure) {
            throw new IllegalStateException("대상 시퀀스 카탈로그를 읽지 못해 적재를 시작하지 않습니다", failure);
        }
    }

    /** 실행한 테이블마다 재설정 기록이나 실패를 결과에 붙인다. 실패는 그 테이블의 오류가 되어 run 을 FAILED 로 만든다. */
    private static void synchronizeTargetSequences(
            DataSource targetDs,
            List<TargetSequenceSynchronizer.Target> plan,
            List<TableResult> results
    ) {
        if (plan.isEmpty()) {
            return;
        }
        Map<String, List<TargetSequenceSynchronizer.SequenceReset>> resets = new LinkedHashMap<>();
        Map<String, List<String>> failures = new LinkedHashMap<>();
        Set<String> ranTables = new HashSet<>();
        for (TableResult result : results) {
            ranTables.add(result.sourceTable().toLowerCase(Locale.ROOT));
        }
        try (Connection target = targetDs.getConnection()) {
            for (TargetSequenceSynchronizer.Target planned : plan) {
                String table = planned.sourceTable().toLowerCase(Locale.ROOT);
                if (!ranTables.contains(table)) {
                    continue;
                }
                try {
                    resets.computeIfAbsent(table, ignored -> new ArrayList<>())
                            .add(TargetSequenceSynchronizer.apply(target, planned));
                } catch (SQLException failure) {
                    safeRollback(target);
                    failures.computeIfAbsent(table, ignored -> new ArrayList<>())
                            .add(sequenceFailure(planned, "SQL_EXECUTION_FAILED"));
                } catch (IllegalStateException failure) {
                    safeRollback(target);
                    failures.computeIfAbsent(table, ignored -> new ArrayList<>())
                            .add(sequenceFailure(planned, failure.getMessage()));
                }
            }
        } catch (SQLException connectionFailure) {
            for (TargetSequenceSynchronizer.Target planned : plan) {
                String table = planned.sourceTable().toLowerCase(Locale.ROOT);
                if (ranTables.contains(table)) {
                    failures.computeIfAbsent(table, ignored -> new ArrayList<>())
                            .add(sequenceFailure(planned, "SQL_EXECUTION_FAILED"));
                }
            }
        }
        for (int i = 0; i < results.size(); i++) {
            TableResult result = results.get(i);
            String table = result.sourceTable().toLowerCase(Locale.ROOT);
            if (!resets.containsKey(table) && !failures.containsKey(table)) {
                continue;
            }
            List<String> errors = new ArrayList<>(result.errors());
            errors.addAll(failures.getOrDefault(table, List.of()));
            results.set(i, new TableResult(result.sourceTable(), result.targetTable(), result.read(),
                    result.transformed(), result.written(), errors, resets.getOrDefault(table, List.of())));
        }
    }

    private static String sequenceFailure(TargetSequenceSynchronizer.Target planned, String reason) {
        return "시퀀스 재설정 실패(" + planned.targetTable() + "." + planned.column() + "): " + reason;
    }

    private static void initializeCommitState(
            JdbcTemplate target,
            KeyMapRegistry registry,
            MigrationStateStore state
    ) {
        new MigrationSchemaManager().migrateAndValidate(target);
        registry.preload(target); // 재실행 멱등: 기존 대응 재사용
        state.initialize(target);
    }

    private static void requireSourceReadSession(
            SourceReadSessionPolicy policy,
            boolean sourceFreezeAcknowledged
    ) {
        if (policy == null || !policy.supported()) {
            throw new IllegalStateException("source read session policy is unsupported");
        }
        if (policy.sourceFreezeRequired() && !sourceFreezeAcknowledged) {
            throw new IllegalStateException("source freeze acknowledgement is required");
        }
    }

    private static DataSource requireDataSource(JdbcTemplate jdbc, String boundary) {
        DataSource dataSource = jdbc == null ? null : jdbc.getDataSource();
        if (dataSource == null) {
            throw new IllegalArgumentException(boundary + " DataSource가 없습니다.");
        }
        return dataSource;
    }

    static void requireCommitContract(MappingSpec spec) {
        RunContext run = spec.run();
        if (run == null || isBlank(run.runId()) || isBlank(run.sourceNamespace())) {
            throw new IllegalArgumentException(
                    "commit 모드에는 run.runId와 run.sourceNamespace가 필수입니다");
        }
        for (TableMapping table : spec.tables()) {
            validateIdentityContract(spec, table);
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
            if (table.identity() == null) {
                String targetIdentity = targetIdentityColumn(table);
                if (isBlank(targetIdentity)) {
                    throw new IllegalArgumentException(table.source()
                            + ": checkpoint/verifier용 targetKey 또는 idStrategy.column이 필수입니다");
                }
                SourceIntrospector.ident(targetIdentity);
            }
        }
    }

    private static void validateIdentityContract(MappingSpec spec, TableMapping table) {
        IdentityStrategy identity = table.identity();
        if (identity == null) {
            if (!table.foreignKeys().isEmpty()) {
                throw new IllegalArgumentException(table.source()
                        + ": composite foreignKeys에는 typed identity가 필수입니다");
            }
            return;
        }
        if (table.idStrategy() != null) {
            throw new IllegalArgumentException(table.source()
                    + ": legacy idStrategy와 typed identity를 함께 선언할 수 없습니다");
        }
        requireComponents(table.source(), "sourceComponents", identity.sourceComponents());
        requireComponents(table.source(), "targetComponents", identity.targetComponents());
        if (identity.policy() == TargetIdentityPolicy.PRESERVE
                && identity.sourceComponents().size() != identity.targetComponents().size()) {
            throw new IllegalArgumentException(table.source() + ": PRESERVE identity arity 불일치");
        }
        if (identity.policy() == TargetIdentityPolicy.REMAP) {
            Set<String> valueProducers = new HashSet<>();
            for (ColumnMapping column : table.columns()) {
                if (!isBlank(column.target())) {
                    valueProducers.add(column.target().toLowerCase(Locale.ROOT));
                }
            }
            for (CompositeForeignKey foreignKey : table.foreignKeys()) {
                for (IdentityComponentSpec component : foreignKey.targetComponents()) {
                    valueProducers.add(component.column().toLowerCase(Locale.ROOT));
                }
            }
            for (IdentityComponentSpec target : identity.targetComponents()) {
                if (!valueProducers.contains(target.column().toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException(table.source()
                            + ": REMAP target identity component 값 생성 mapping 없음: "
                            + target.column());
                }
            }
        }
        if (identity.policy() == TargetIdentityPolicy.TARGET_GENERATED
                && (spec.target() == null || spec.target().url() == null
                || !spec.target().url().toLowerCase(Locale.ROOT).startsWith("jdbc:postgresql:"))) {
            throw new IllegalArgumentException(table.source()
                    + ": TARGET_GENERATED는 PostgreSQL INSERT ... RETURNING target에서만 지원됩니다");
        }
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            requireComponents(table.source(), "foreignKeys.sourceComponents", foreignKey.sourceComponents());
            requireComponents(table.source(), "foreignKeys.targetComponents", foreignKey.targetComponents());
            if (foreignKey.sourceComponents().size() != foreignKey.targetComponents().size()) {
                throw new IllegalArgumentException(table.source()
                        + ": composite foreign key source/target arity 불일치");
            }
            TableMapping parent = spec.tables().stream()
                    .filter(candidate -> candidate.source() != null
                            && candidate.source().equalsIgnoreCase(foreignKey.parentSource()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(table.source()
                            + ": composite foreign key parent mapping 없음: " + foreignKey.parentSource()));
            if (parent.identity() == null
                    || !sameOrderedTypes(
                            parent.identity().sourceComponents(), foreignKey.sourceComponents())
                    || !sameOrderedTypes(
                            parent.identity().targetComponents(), foreignKey.targetComponents())) {
                throw new IllegalArgumentException(table.source()
                        + ": composite foreign key component arity/type 순서가 parent typed identity와 불일치합니다");
            }
        }
    }

    private static boolean sameOrderedTypes(
            List<IdentityComponentSpec> expected,
            List<IdentityComponentSpec> actual
    ) {
        if (expected.size() != actual.size()) {
            return false;
        }
        for (int i = 0; i < expected.size(); i++) {
            if (expected.get(i).type() != actual.get(i).type()) {
                return false;
            }
        }
        return true;
    }

    private static void requireComponents(
            String table,
            String label,
            List<IdentityComponentSpec> components
    ) {
        if (components.isEmpty()) {
            throw new IllegalArgumentException(table + ": " + label + "가 비어 있습니다");
        }
        Set<String> names = new HashSet<>();
        for (IdentityComponentSpec component : components) {
            SourceIntrospector.ident(component.column());
            if (!names.add(component.column().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException(table + ": " + label + " 중복: " + component.column());
            }
        }
    }

    static void requireCompositeForeignKeyOrder(List<TableMapping> orderedTables) {
        Map<String, Integer> order = new LinkedHashMap<>();
        for (int i = 0; i < orderedTables.size(); i++) {
            order.put(orderedTables.get(i).source().toLowerCase(Locale.ROOT), i);
        }
        for (int childIndex = 0; childIndex < orderedTables.size(); childIndex++) {
            TableMapping child = orderedTables.get(childIndex);
            for (CompositeForeignKey foreignKey : child.foreignKeys()) {
                String parent = foreignKey.parentSource().toLowerCase(Locale.ROOT);
                String self = child.source().toLowerCase(Locale.ROOT);
                if (parent.equals(self)) {
                    throw new IllegalArgumentException(child.source()
                            + ": typed composite self reference is blocked; generated identity pre-mint is unsafe");
                }
                Integer parentIndex = order.get(parent);
                if (parentIndex == null || parentIndex >= childIndex) {
                    throw new IllegalArgumentException(child.source()
                            + ": composite foreign key requires explicit parent-first order: "
                            + foreignKey.parentSource());
                }
            }
        }
    }

    private TableExecution runTable(Connection sourceConnection, DataSource targetDs, MappingSpec spec,
                                    TableMapping t, KeyMapRegistry reg, MigrationStateStore state,
                                    boolean commit, ColumnProtector protector) {
        List<String> errors = new ArrayList<>();
        List<String> targetCols = canonicalTargetColumns(t);
        List<String> insertCols = insertTargetColumns(t);
        List<String> returningCols = returningTargetColumns(t);
        WritePlan writePlan = new WritePlan(
                targetCols,
                insertCols,
                returningCols,
                buildInsertSql(t.target(), insertCols, returningCols),
                protector);
        TableCounts counts = new TableCounts();
        boolean sourceSessionFailed = false;
        boolean rowFailureStopped = false;

        Connection targetConn = null;
        try {
            if (commit) {
                targetConn = targetDs.getConnection();
                targetConn.setReadOnly(false);
                targetConn.setAutoCommit(false);
            }
            preMintSelfReferences(sourceConnection, targetConn, t, reg);
            if (t.effectiveOrderKeys().isEmpty()) {
                rowFailureStopped = !streamUnorderedDryRun(sourceConnection, spec, t, writePlan, reg, state,
                        targetConn, counts, errors);
            } else {
                rowFailureStopped = !readKeysetPages(sourceConnection, spec, t, writePlan, reg, state,
                        targetConn, counts, errors);
            }
        } catch (SQLException failure) {
            sourceSessionFailed = true;
            String reason = failure instanceof JdbcLobReader.ContentReadException content
                    ? content.reason() : "SQL_EXECUTION_FAILED";
            errors.add("이관 실패(" + t.source() + "): " + reason);
            safeRollback(targetConn);
        } catch (Throwable failure) {
            safeRollback(targetConn);
            throw propagate(failure);
        } finally {
            safeClose(targetConn);
        }
        long durableWritten = state == null ? counts.written : state.count(t.source());
        return new TableExecution(
                new TableResult(t.source(), t.target(), counts.read, counts.transformed, durableWritten, errors),
                sourceSessionFailed, rowFailureStopped);
    }

    /** 행 변환 실패로 run 이 멈춘 뒤의 테이블. 앞서 커밋된 checkpoint 수만 기록 건수로 보인다. */
    private static TableResult notProcessed(TableMapping table, TableMapping stoppedAt,
                                            MigrationStateStore state) {
        long durableWritten = state == null ? 0L : state.count(table.source());
        return new TableResult(table.source(), table.target(), 0L, 0L, durableWritten,
                List.of("적재 중단으로 처리하지 않음(" + table.source() + "): 앞 테이블 "
                        + stoppedAt.source() + " 의 행 변환 실패 — RUN_STOPPED_BY_ROW_FAILURE"));
    }

    private static TableResult preflightOrderTupleUniqueness(
            Connection source,
            List<TableMapping> orderedTables
    ) {
        for (TableMapping table : orderedTables) {
            try {
                requireUniqueOrderTuple(source, table);
            } catch (SQLException ignored) {
                return new TableResult(
                        table.source(), table.target(), 0, 0, 0,
                        List.of("이관 실패(" + table.source() + "): SQL_EXECUTION_FAILED"));
            }
        }
        return null;
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

    /** @return 끝까지 처리하면 true, 행 변환 실패로 멈추면 false */
    private boolean streamUnorderedDryRun(Connection source, MappingSpec spec, TableMapping table,
                                          WritePlan writePlan,
                                          KeyMapRegistry registry, MigrationStateStore state,
                                          Connection target, TableCounts counts, List<String> errors) throws SQLException {
        String sql = buildSourcePageSql(table, false);
        boolean boundedVariableValues = "Microsoft SQL Server".equals(source.getMetaData().getDatabaseProductName());
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql)) {
            try (ResultSet result = statement.executeQuery()) {
                String[] labels = lowerLabels(result.getMetaData());
                List<Map<String, Object>> chunk = new ArrayList<>(CHUNK);
                long retainedBytes = 0;
                while (result.next()) {
                    counts.read++;
                    Map<String, Object> row = readRow(result, labels, boundedVariableValues);
                    chunk.add(row);
                    retainedBytes += rowBytes(row);
                    if (chunk.size() == CHUNK || retainedBytes >= JdbcLobReader.PAGE_BYTES) {
                        if (!processChunk(chunk, spec, table, writePlan, registry, state,
                                target, counts, errors)) {
                            return false;
                        }
                        chunk.clear();
                        retainedBytes = 0;
                    }
                }
                if (!chunk.isEmpty()) {
                    return processChunk(chunk, spec, table, writePlan, registry, state,
                            target, counts, errors);
                }
            }
        }
        return true;
    }

    /** @return 끝까지 처리하면 true, 행 변환 실패로 멈추면 false */
    private boolean readKeysetPages(Connection source, MappingSpec spec, TableMapping table,
                                    WritePlan writePlan,
                                    KeyMapRegistry registry, MigrationStateStore state,
                                    Connection target, TableCounts counts, List<String> errors) throws SQLException {
        List<Object> cursor = null;
        Set<String> seenSourceKeys = new HashSet<>();
        Set<String> seenOrderDigests = new HashSet<>();
        boolean hasMore;
        do {
            SourcePage page = readSourcePage(source, table, cursor);
            hasMore = page.hasMore();
            List<Map<String, Object>> accepted = new ArrayList<>(page.rows().size());
            for (Map<String, Object> row : page.rows()) {
                counts.read++;
                String sourceKey = sourceKey(row, table);
                if (!seenSourceKeys.add(sourceKey)) {
                    throw new SQLException(
                            "중복 source identity(" + table.source() + "): sourceDigest="
                                    + KeyDiagnostics.digest(sourceKey));
                }
                String orderDigest = orderDigest(row, table);
                if (!seenOrderDigests.add(orderDigest)) {
                    throw new SQLException(
                            "중복 order identity(" + table.source() + "): orderDigest="
                                    + orderDigest);
                }
                accepted.add(row);
            }
            if (!accepted.isEmpty()
                    && !processChunk(accepted, spec, table, writePlan, registry, state,
                            target, counts, errors)) {
                return false;
            }
            if (!page.rows().isEmpty()) {
                cursor = orderValues(page.rows().get(page.rows().size() - 1), table);
            }
            // Do not retain the previous large page while JDBC constructs the next one.
            accepted.clear();
            page.rows().clear();
        } while (hasMore);
        return true;
    }

    private record SourcePage(List<Map<String, Object>> rows, boolean hasMore) {}

    private record TableExecution(TableResult result, boolean sourceSessionFailed,
                                  boolean rowFailureStopped) {}

    private static final class TableCounts {
        private long read;
        private long transformed;
        private long written;
    }

    private record WritePlan(
            List<String> targetColumns,
            List<String> insertColumns,
            List<String> returningColumns,
            String insertSql,
            ColumnProtector protector
    ) {}

    private SourcePage readSourcePage(Connection source, TableMapping table,
                                      List<Object> cursor) throws SQLException {
        String sql = buildSourcePageSql(table, cursor != null);
        boolean boundedVariableValues = "Microsoft SQL Server".equals(source.getMetaData().getDatabaseProductName());
        try (PreparedStatement statement = SourceReadStatements.prepare(source, sql)) {
            if (cursor != null) {
                bindSeek(statement, cursor);
            }
            statement.setMaxRows(CHUNK + 1);
            try (ResultSet result = statement.executeQuery()) {
                String[] labels = lowerLabels(result.getMetaData());
                List<Map<String, Object>> rows = new ArrayList<>(CHUNK + 1);
                long retainedBytes = 0;
                boolean hasMore = false;
                while (result.next()) {
                    if (rows.size() == CHUNK || (!rows.isEmpty() && retainedBytes >= JdbcLobReader.PAGE_BYTES)) {
                        // Look ahead at ordering values only; do not allocate another large payload.
                        Map<String, Object> boundary = new LinkedHashMap<>();
                        for (int i = 0; i < labels.length; i++) {
                            for (String key : table.effectiveOrderKeys()) {
                                if (labels[i].equalsIgnoreCase(key)) boundary.put(labels[i], boundedVariableValues
                                        ? JdbcLobReader.read(result, i + 1, true) : result.getObject(i + 1));
                            }
                        }
                        String lastOrderDigest = orderDigest(rows.getLast(), table);
                        if (lastOrderDigest.equals(orderDigest(boundary, table))) {
                            throw new SQLException(table.source()
                                    + ": keyset page 경계의 order identity 중복: orderDigest=" + lastOrderDigest);
                        }
                        hasMore = true;
                        break;
                    }
                    Map<String, Object> row = readRow(result, labels, boundedVariableValues);
                    rows.add(row);
                    retainedBytes += rowBytes(row);
                }
                return new SourcePage(rows, hasMore);
            }
        }
    }

    static String buildSourcePageSql(TableMapping table, boolean seek) {
        List<String> sourceColumns = SourceProjection.requiredColumns(table);
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
        boolean boundedVariableValues = "Microsoft SQL Server".equals(sourceConnection.getMetaData().getDatabaseProductName());
        try (PreparedStatement statement = SourceReadStatements.prepare(sourceConnection, sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Object raw = boundedVariableValues ? JdbcLobReader.read(result, 1, true) : result.getObject(1);
                if (raw == null || raw.toString().isBlank()) {
                    throw new SQLException(table.source() + ": 자기참조 sourceKey가 null/blank입니다");
                }
                String legacyKey = raw.toString();
                if (!seen.add(legacyKey)) {
                    throw new SQLException(table.source() + ": 자기참조 sourceKey 중복: digest="
                            + KeyDiagnostics.digest(legacyKey));
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

    /**
     * chunk 를 변환한 뒤 한 transaction 으로 쓴다.
     *
     * <p>[2026-10-13 DEC-OPS-309] 행 하나라도 변환(transform·codemap·type·fkRef·identity)에 실패하면
     * 그 chunk 는 한 행도 쓰지 않는다. 이 chunk 에서 새로 만든 keymap 도 버리고 테이블과 run 을 멈춘다.
     * 종전에는 실패 행만 건너뛰고 나머지를 커밋해, 승인 없는 누락이 적재된 채 run 만 FAIL 로 끝났다.
     * 재개는 마지막으로 커밋된 checkpoint 에서 시작한다. 승인된 예외 행의 격리(Q6 원장)는 아직 없다.
     *
     * @return 계속 진행하면 true, 행 변환 실패로 멈추면 false
     */
    private boolean processChunk(List<Map<String, Object>> chunk, MappingSpec spec, TableMapping t,
                                 WritePlan writePlan, KeyMapRegistry reg,
                                 MigrationStateStore state, Connection targetConn,
                                 TableCounts counts, List<String> errors) {
        long firstOrdinal = counts.read - chunk.size() + 1;
        if (isTargetGenerated(t)) {
            return processGeneratedRows(chunk, spec, t, writePlan, reg, state, targetConn, counts, errors,
                    firstOrdinal);
        }
        Checkpoint chunkCheckpoint = reg.checkpoint();
        List<PreparedRow> batch = new ArrayList<>(chunk.size());
        for (int index = 0; index < chunk.size(); index++) {
            Map<String, Object> row = chunk.get(index);
            Checkpoint rowCheckpoint = reg.checkpoint();
            try {
                Map<String, Object> out = transformRow(row, spec, t, reg, writePlan.protector());
                counts.transformed++;
                CheckpointEntry checkpoint = null;
                if (state != null) {
                    checkpoint = identityCheckpoint(row, out, t, writePlan.targetColumns());
                    CheckpointEntry durable = state.find(t.source(), checkpoint.sourceKey());
                    if (durable != null) {
                        if (t.identity() != null
                                && reg.checkpoint().pendingSize() > rowCheckpoint.pendingSize()) {
                            errors.add("resume checkpoint/keymap missing for durable typed identity("
                                    + t.source() + ", sourceDigest="
                                    + KeyDiagnostics.digest(checkpoint.sourceKey()) + ")");
                            reg.rollback(rowCheckpoint);
                            continue;
                        }
                        if (!durable.rowChecksum().equals(checkpoint.rowChecksum())
                                || !durable.targetKey().equals(checkpoint.targetKey())
                                || !durable.targetTable().equalsIgnoreCase(checkpoint.targetTable())) {
                            errors.add("resume checkpoint/source checksum 불일치(" + t.source()
                                    + ", sourceDigest=" + KeyDiagnostics.digest(checkpoint.sourceKey()) + ")");
                        }
                        reg.rollback(rowCheckpoint);
                        continue;
                    }
                }
                batch.add(new PreparedRow(row, toArguments(out, writePlan.insertColumns()), checkpoint));
            } catch (RuntimeException failure) {
                reg.rollback(chunkCheckpoint);
                errors.add(rowFailureMessage(t, failure, firstOrdinal + index));
                return false;
            }
        }
        if (batch.isEmpty()) {
            reg.rollback(chunkCheckpoint);
            return true;
        }
        if (targetConn == null) {
            // dry-run에서도 이후 자식 fkRef 검증에 성공한 부모 keymap은 필요하지만 pending 표식은 남기지 않는다.
            reg.accept(chunkCheckpoint);
            return true;
        }
        counts.written += writeChunkAtomically(
                targetConn, writePlan.insertSql(), batch, spec, t, writePlan, reg, state,
                chunkCheckpoint, errors);
        return true;
    }

    /**
     * 행 변환 실패를 테이블·컬럼·행 위치로만 밝힌다. 값·키·예외 원문은 담지 않는다.
     * 행 위치는 이 테이블을 원천 정렬(orderBy/orderByKeys) 순서로 읽은 1부터의 순번이다.
     */
    static String rowFailureMessage(TableMapping table, RuntimeException failure, long ordinal) {
        String column = failure instanceof RowTransformFailure classified ? classified.column : "-";
        RowFailureReason reason = failure instanceof RowTransformFailure classified
                ? classified.reason : RowFailureReason.ROW_FAILED;
        String detail = failure instanceof RowTransformFailure classified && classified.detail != null
                ? "(" + classified.detail + ")" : "";
        return "행 변환 실패(" + table.source() + ", column=" + column + ", row=" + ordinal
                + "): ROW_TRANSFORM_FAILED:" + reason.name() + detail
                + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다";
    }

    /** 행 변환이 어느 단계에서 실패했는지. 값은 담지 않는다. */
    enum RowFailureReason {
        TRANSFORM_FAILED,
        CODEMAP_UNDEFINED,
        CODEMAP_UNMAPPED,
        CODEMAP_INPUT_INVALID,
        TYPE_CONVERSION_FAILED,
        FK_REF_ORPHAN,
        FK_REF_FAILED,
        IDENTITY_FAILED,
        PROTECTED_COLUMN,
        ROW_FAILED
    }

    /**
     * 행 변환 실패의 컬럼과 단계. 원인 예외(원문에 값이 들어갈 수 있다)는 붙이지 않는다.
     * {@code detail} 은 보호 컬럼 판정처럼 값이 들어가지 않는 고정 사유만 담는다.
     */
    static final class RowTransformFailure extends IllegalStateException {
        private final String column;
        private final RowFailureReason reason;
        private final String detail;

        RowTransformFailure(String column, RowFailureReason reason) {
            this(column, reason, null);
        }

        RowTransformFailure(String column, RowFailureReason reason, String detail) {
            super("row transform failed: " + reason.name());
            this.column = column;
            this.reason = reason;
            this.detail = detail;
        }
    }

    private record PreparedRow(Map<String, Object> source, Object[] arguments,
                               CheckpointEntry checkpoint) {}

    /**
     * generated identity는 JDBC batch가 반환값을 증명하지 못하므로 행별 INSERT ... RETURNING 경로만 사용한다.
     *
     * <p>[2026-10-13 DEC-OPS-309] 행별로 커밋하므로 chunk 의 모든 행을 먼저 변환한 뒤에 쓴다. 한 행이라도
     * 변환에 실패하면 이 chunk 의 어느 행도 쓰지 않고 멈춘다.
     *
     * @return 계속 진행하면 true, 행 변환 실패로 멈추면 false
     */
    private boolean processGeneratedRows(
            List<Map<String, Object>> rows,
            MappingSpec spec,
            TableMapping table,
            WritePlan writePlan,
            KeyMapRegistry registry,
            MigrationStateStore state,
            Connection connection,
            TableCounts counts,
            List<String> errors,
            long firstOrdinal
    ) {
        if (connection == null) {
            boolean completed = true;
            for (int index = 0; index < rows.size(); index++) {
                Checkpoint checkpoint = registry.checkpoint();
                try {
                    transformRow(rows.get(index), spec, table, registry, writePlan.protector());
                    counts.transformed++;
                } catch (RuntimeException failure) {
                    errors.add(rowFailureMessage(table, failure, firstOrdinal + index));
                    completed = false;
                    break;
                } finally {
                    registry.rollback(checkpoint);
                }
            }
            errors.add(table.source()
                    + ": TARGET_GENERATED dry-run은 DB 생성 identity를 materialize할 수 없습니다");
            return completed;
        }

        Checkpoint chunkCheckpoint = registry.checkpoint();
        List<GeneratedRow> prepared = new ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            Map<String, Object> row = rows.get(index);
            Checkpoint rowCheckpoint = registry.checkpoint();
            try {
                Map<String, Object> transformed = transformRow(row, spec, table, registry, writePlan.protector());
                TypedKeyTuple sourceIdentity = tupleFromValues(row, table.identity().sourceComponents());
                counts.transformed++;
                String encodedSource = TypedKeyEncoding.encode(
                        sourceIdentity, 256, "tb_migration_checkpoint.source_key");
                CheckpointEntry durable = state.find(table.source(), encodedSource);
                if (durable != null) {
                    if (!TypedKeyEncoding.isTyped(durable.targetKey())) {
                        throw new IllegalStateException(table.source()
                                + ": typed identity checkpoint target_key가 legacy 형식입니다");
                    }
                    TypedKeyTuple durableTarget = TypedKeyEncoding.decode(durable.targetKey());
                    TypedKeyTuple mappedTarget = registry.translate(table.source(), sourceIdentity);
                    if (mappedTarget == null) {
                        errors.add("resume checkpoint/keymap missing for durable generated identity("
                                + table.source() + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                        registry.rollback(rowCheckpoint);
                        continue;
                    }
                    if (!mappedTarget.equals(durableTarget)) {
                        errors.add("resume checkpoint/keymap mismatch for durable generated identity("
                                + table.source() + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                        registry.rollback(rowCheckpoint);
                        continue;
                    }
                    applyTargetIdentity(transformed, table.identity().targetComponents(), durableTarget);
                    CheckpointEntry expected = checkpoint(
                            row, transformed, table, writePlan.targetColumns());
                    if (!durable.rowChecksum().equals(expected.rowChecksum())
                            || !durable.targetKey().equals(expected.targetKey())
                            || !durable.targetTable().equalsIgnoreCase(expected.targetTable())) {
                        errors.add("resume checkpoint/source checksum 불일치(" + table.source()
                                + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                    }
                    registry.rollback(rowCheckpoint);
                    continue;
                }
                prepared.add(new GeneratedRow(row, transformed, sourceIdentity));
            } catch (RuntimeException failure) {
                registry.rollback(chunkCheckpoint);
                errors.add(rowFailureMessage(table, failure, firstOrdinal + index));
                return false;
            }
        }

        for (GeneratedRow candidate : prepared) {
            Checkpoint rowCheckpoint = registry.checkpoint();
            Map<String, Object> transformed = candidate.transformed();
            CheckpointEntry durableCheckpoint;
            try {
                TypedKeyTuple generated = executeReturning(
                        connection,
                        writePlan.insertSql(),
                        toArguments(transformed, writePlan.insertColumns()),
                        table.identity().targetComponents());
                applyTargetIdentity(transformed, table.identity().targetComponents(), generated);
                registry.register(table.source(), candidate.sourceIdentity(), generated);
                durableCheckpoint = checkpoint(
                        candidate.source(), transformed, table, writePlan.targetColumns());
                registry.writePending(connection, rowCheckpoint);
                state.write(connection, List.of(durableCheckpoint));
            } catch (SQLException | RuntimeException ignored) {
                rollbackAndDiscard(connection, registry, rowCheckpoint, table.target());
                errors.add("원자 INSERT RETURNING/keymap/checkpoint 실패(" + table.target()
                        + "): TARGET_GENERATED_WRITE_FAILED");
                continue;
            }
            commitAndAccept(connection, registry, rowCheckpoint, state,
                    List.of(durableCheckpoint), table.target());
            counts.written++;
        }
        return true;
    }

    private record GeneratedRow(Map<String, Object> source, Map<String, Object> transformed,
                                TypedKeyTuple sourceIdentity) {}

    private TypedKeyTuple executeReturning(
            Connection connection,
            String sql,
            Object[] arguments,
            List<IdentityComponentSpec> returnedComponents
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bind(statement, arguments);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("INSERT ... RETURNING이 identity 행을 반환하지 않았습니다");
                }
                List<TypedValue> values = new ArrayList<>(returnedComponents.size());
                for (int i = 0; i < returnedComponents.size(); i++) {
                    values.add(identityCodec.encode(
                            returnedComponents.get(i).type(), result.getObject(i + 1)));
                }
                if (result.next()) {
                    throw new SQLException("INSERT ... RETURNING이 둘 이상의 identity 행을 반환했습니다");
                }
                return TypedKeyTuple.of(values.toArray(TypedValue[]::new));
            }
        }
    }

    /** checkpoint identity 를 만들지 못하면(대리키·target identity 없음) identity 단계의 행 변환 실패다. */
    private CheckpointEntry identityCheckpoint(Map<String, Object> source, Map<String, Object> transformed,
                                               TableMapping table, List<String> targetColumns) {
        try {
            return checkpoint(source, transformed, table, targetColumns);
        } catch (RuntimeException failure) {
            String column = targetIdentityColumn(table);
            throw new RowTransformFailure(column == null ? "<identity>" : column, RowFailureReason.IDENTITY_FAILED);
        }
    }

    private CheckpointEntry checkpoint(Map<String, Object> source, Map<String, Object> transformed,
                                       TableMapping table, List<String> targetColumns) {
        if (table.identity() != null) {
            return CheckpointEntry.typed(
                    table.source(),
                    tupleFromValues(source, table.identity().sourceComponents()),
                    table.target(),
                    tupleFromValues(transformed, table.identity().targetComponents()),
                    RowChecksum.calculate(targetColumns, transformed));
        }
        String sourceKey = sourceKey(source, table);
        Object targetValue = transformed.get(targetIdentityColumn(table));
        if (targetValue == null || targetValue.toString().isBlank()) {
            throw new IllegalStateException(table.source() + ": target identity가 null/blank입니다");
        }
        return new CheckpointEntry(table.source(), sourceKey, table.target(), targetValue.toString(),
                RowChecksum.calculate(targetColumns, transformed));
    }

    private String sourceKey(Map<String, Object> source, TableMapping table) {
        if (table.identity() != null) {
            return TypedKeyEncoding.encode(
                    tupleFromValues(source, table.identity().sourceComponents()),
                    256,
                    "tb_migration_checkpoint.source_key");
        }
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

    /** keyset order tuple 값은 외부 오류에 노출하지 않고 결정적 digest로만 비교한다. */
    private static String orderDigest(Map<String, Object> source, TableMapping table) {
        orderValues(source, table); // null/blank order key를 먼저 fail-closed 한다.
        return RowChecksum.calculate(table.effectiveOrderKeys(), source);
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

    private Map<String, Object> transformRow(Map<String, Object> src, MappingSpec spec, TableMapping t,
                                             KeyMapRegistry reg, ColumnProtector protector) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (ColumnMapping col : t.columns()) {
            Object value;
            if (col.constant() != null) {
                value = col.constant();
            } else if (col.source() != null) {
                value = columnValue(src.get(col.source().toLowerCase(Locale.ROOT)), spec, col, reg);
                // 보호 컬럼은 변환의 마지막에 온라인 앱과 같은 암호문으로 바꾼다. 평문 형태면 이 chunk 를 쓰지 않는다.
                value = protectColumn(protector, t, col, value);
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
        try {
            applyCompositeForeignKeys(src, out, t, reg);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure("<foreignKeys>", RowFailureReason.FK_REF_FAILED);
        }
        try {
            applyTypedIdentity(src, out, t, reg);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure("<identity>", RowFailureReason.IDENTITY_FAILED);
        }
        return out;
    }

    /**
     * 보호 컬럼이면 온라인 앱과 같은 암호문으로 바꾼다. 쓰지 않기로 한 판정은 고정 사유만 남기고,
     * 그 밖의 실패(원문에 값이 들어갈 수 있다)는 사유 없이 PROTECTED_COLUMN 으로만 알린다(DEC-OPS-308·309).
     */
    private static Object protectColumn(ColumnProtector protector, TableMapping table, ColumnMapping col, Object value) {
        try {
            return protector.protect(table.target(), col.target(), value);
        } catch (ColumnProtector.ProtectedColumnException refused) {
            throw new RowTransformFailure(col.target(), RowFailureReason.PROTECTED_COLUMN, refused.reason());
        } catch (RuntimeException failure) {
            throw new RowTransformFailure(col.target(), RowFailureReason.PROTECTED_COLUMN);
        }
    }

    /**
     * 한 컬럼의 값을 {@code transform → codemap → type → fkRef} 순서로 만든다.
     * 실패하면 어느 단계였는지만 남기고 원인 예외(원문에 값이 들어갈 수 있다)는 버린다.
     */
    private Object columnValue(Object sourceValue, MappingSpec spec, ColumnMapping col, KeyMapRegistry reg) {
        Object value;
        try {
            value = transformers.apply(col.transform(), sourceValue);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure(col.target(), RowFailureReason.TRANSFORM_FAILED);
        }
        if (!isBlank(col.codemap())) {
            CodeMap codemap = spec.codemaps().get(col.codemap());
            if (codemap == null) {
                throw new RowTransformFailure(col.target(), RowFailureReason.CODEMAP_UNDEFINED);
            }
            try {
                value = CodeTranslator.map(codemap, value);
            } catch (CodeTranslator.UnmappedCodeException unmapped) {
                throw new RowTransformFailure(col.target(), RowFailureReason.CODEMAP_UNMAPPED);
            } catch (RuntimeException invalid) {
                throw new RowTransformFailure(col.target(), RowFailureReason.CODEMAP_INPUT_INVALID);
            }
        }
        try {
            value = TypeConverter.convert(col.type(), value);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure(col.target(), RowFailureReason.TYPE_CONVERSION_FAILED);
        }
        try {
            return applyFkRef(col, value, reg);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure(col.target(), RowFailureReason.FK_REF_ORPHAN);
        }
    }

    private void applyTypedIdentity(
            Map<String, Object> source,
            Map<String, Object> target,
            TableMapping table,
            KeyMapRegistry registry
    ) {
        IdentityStrategy identity = table.identity();
        if (identity == null || identity.policy() == TargetIdentityPolicy.TARGET_GENERATED) {
            return;
        }
        TypedKeyTuple sourceTuple = tupleFromValues(source, identity.sourceComponents());
        if (identity.policy() == TargetIdentityPolicy.PRESERVE) {
            for (int i = 0; i < identity.sourceComponents().size(); i++) {
                TypedValue sourceValue = identityCodec.encode(
                        identity.sourceComponents().get(i).type(),
                        valueIgnoreCase(source, identity.sourceComponents().get(i).column()));
                putOrValidateTarget(
                        target,
                        identity.targetComponents().get(i),
                        sourceValue.jdbcValue());
            }
        }
        TypedKeyTuple targetTuple = tupleFromValues(target, identity.targetComponents());
        registry.register(table.source(), sourceTuple, targetTuple);
    }

    private void applyCompositeForeignKeys(
            Map<String, Object> source,
            Map<String, Object> target,
            TableMapping table,
            KeyMapRegistry registry
    ) {
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            List<Object> sourceValues = foreignKey.sourceComponents().stream()
                    .map(component -> valueIgnoreCase(source, component.column()))
                    .toList();
            if (sourceValues.isEmpty()) {
                throw new IllegalStateException("복합 FK source identity component가 비어 있습니다: "
                        + foreignKey.parentSource());
            }
            long nullComponents = sourceValues.stream().filter(value -> value == null).count();
            if (nullComponents == sourceValues.size()) {
                for (IdentityComponentSpec targetComponent : foreignKey.targetComponents()) {
                    putOrValidateTarget(target, targetComponent, null);
                }
                continue;
            }
            if (nullComponents > 0) {
                throw new IllegalStateException("복합 FK partial-null은 허용되지 않습니다: "
                        + foreignKey.parentSource());
            }
            TypedKeyTuple sourceTuple = tupleFromValues(source, foreignKey.sourceComponents());
            TypedKeyTuple translated = registry.translate(foreignKey.parentSource(), sourceTuple);
            if (translated == null) {
                throw new IllegalStateException("복합 FK 고아: 부모 '" + foreignKey.parentSource()
                        + "' typed keymap에 source identity 없음");
            }
            if (translated.values().size() != foreignKey.targetComponents().size()) {
                throw new IllegalStateException("복합 FK target identity arity 불일치: "
                        + foreignKey.parentSource());
            }
            for (int i = 0; i < foreignKey.targetComponents().size(); i++) {
                IdentityComponentSpec targetComponent = foreignKey.targetComponents().get(i);
                TypedValue translatedValue = translated.values().get(i);
                TypedValue declared = identityCodec.encode(targetComponent.type(), translatedValue.jdbcValue());
                if (!declared.equals(translatedValue)) {
                    throw new IllegalStateException("복합 FK target identity 타입 불일치: "
                            + targetComponent.column());
                }
                putOrValidateTarget(target, targetComponent, translatedValue.jdbcValue());
            }
        }
    }

    private TypedKeyTuple tupleFromValues(
            Map<String, Object> row,
            List<IdentityComponentSpec> components
    ) {
        List<TypedValue> values = new ArrayList<>(components.size());
        for (IdentityComponentSpec component : components) {
            values.add(identityCodec.encode(
                    component.type(), valueIgnoreCase(row, component.column())));
        }
        return TypedKeyTuple.of(values.toArray(TypedValue[]::new));
    }

    private void applyTargetIdentity(
            Map<String, Object> target,
            List<IdentityComponentSpec> components,
            TypedKeyTuple identity
    ) {
        if (components.size() != identity.values().size()) {
            throw new IllegalStateException("returned target identity arity 불일치");
        }
        for (int i = 0; i < components.size(); i++) {
            TypedValue value = identity.values().get(i);
            TypedValue declared = identityCodec.encode(components.get(i).type(), value.jdbcValue());
            if (!declared.equals(value)) {
                throw new IllegalStateException("returned target identity 타입 불일치: "
                        + components.get(i).column());
            }
            putOrValidateTarget(target, components.get(i), value.jdbcValue());
        }
    }

    private void putOrValidateTarget(
            Map<String, Object> target,
            IdentityComponentSpec component,
            Object value
    ) {
        String existingKey = keyIgnoreCase(target, component.column());
        if (existingKey != null) {
            TypedValue existing = identityCodec.encode(component.type(), target.get(existingKey));
            TypedValue candidate = identityCodec.encode(component.type(), value);
            if (!existing.equals(candidate)) {
                throw new IllegalStateException("target identity mapped/returned 값 불일치: "
                        + component.column());
            }
        }
        target.put(component.column(), value);
    }

    private static Object valueIgnoreCase(Map<String, Object> values, String column) {
        String key = keyIgnoreCase(values, column);
        return key == null ? null : values.get(key);
    }

    private static String keyIgnoreCase(Map<String, Object> values, String column) {
        for (String key : values.keySet()) {
            if (key.equalsIgnoreCase(column)) {
                return key;
            }
        }
        return null;
    }

    /** 자식 FK 값을 부모 키맵으로 신규 키에 번역. 미매핑(고아)은 행 변환 실패다(값은 메시지에 싣지 않는다). null 은 통과. */
    private Object applyFkRef(ColumnMapping col, Object value, KeyMapRegistry reg) {
        if (col.fkRef() == null || col.fkRef().isBlank() || value == null) {
            return value;
        }
        String translated = reg.translate(col.fkRef(), value.toString());
        if (translated == null) {
            throw new IllegalStateException("FK 고아: 부모 '" + col.fkRef() + "' 키맵에 대응 없음");
        }
        return translated;
    }

    private long writeChunkAtomically(Connection connection, String sql, List<PreparedRow> rows,
                                      MappingSpec spec, TableMapping table, WritePlan writePlan,
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
                    connection, sql, rows, spec, table, writePlan, registry, state, errors);
        }
        commitAndAccept(connection, registry, checkpoint, state, checkpoints, table.target());
        return written;
    }

    private long writeRowsAtomically(Connection connection, String sql, List<PreparedRow> rows,
                                     MappingSpec spec, TableMapping table, WritePlan writePlan,
                                     KeyMapRegistry registry, MigrationStateStore state,
                                     List<String> errors) {
        long written = 0L;
        for (PreparedRow row : rows) {
            Checkpoint rowCheckpoint = registry.checkpoint();
            Object[] arguments;
            CheckpointEntry durableCheckpoint;
            try {
                Map<String, Object> transformed = transformRow(
                        row.source(), spec, table, registry, writePlan.protector());
                arguments = toArguments(transformed, writePlan.insertColumns());
                durableCheckpoint = checkpoint(
                        row.source(), transformed, table, writePlan.targetColumns());
            } catch (RuntimeException ignored) {
                registry.rollback(rowCheckpoint);
                errors.add("행 재변환 실패(" + table.source() + "): ROW_RETRY_TRANSFORM_FAILED");
                continue;
            }

            try {
                int updateCount = executeSingle(connection, sql, arguments);
                registry.writePending(connection, rowCheckpoint);
                state.write(connection, List.of(durableCheckpoint));
                commitAndAccept(connection, registry, rowCheckpoint, state,
                        List.of(durableCheckpoint), table.target());
                written += updateCount;
            } catch (SQLException ignored) {
                rollbackAndDiscard(connection, registry, rowCheckpoint, table.target());
                errors.add("원자 INSERT/keymap 실패(" + table.target() + "): ATOMIC_WRITE_FAILED");
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
        List<String> cols = new ArrayList<>(insertTargetColumns(t));
        if (t.identity() != null) {
            for (IdentityComponentSpec component : t.identity().targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        return cols;
    }

    public static List<String> insertTargetColumns(TableMapping t) {
        List<String> cols = new ArrayList<>();
        for (ColumnMapping c : t.columns()) {
            if (c.target() != null) {
                addColumn(cols, c.target());
            }
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null) {
            addColumn(cols, id.column());
        }
        if (t.identity() != null && t.identity().policy() != TargetIdentityPolicy.TARGET_GENERATED) {
            for (IdentityComponentSpec component : t.identity().targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        for (CompositeForeignKey foreignKey : t.foreignKeys()) {
            for (IdentityComponentSpec component : foreignKey.targetComponents()) {
                addColumn(cols, component.column());
            }
        }
        return cols;
    }

    private static List<String> returningTargetColumns(TableMapping table) {
        if (!isTargetGenerated(table)) {
            return List.of();
        }
        return table.identity().targetComponents().stream()
                .map(IdentityComponentSpec::column)
                .toList();
    }

    public static String targetIdentityColumn(TableMapping table) {
        if (table.identity() != null) {
            return table.identity().targetComponents().size() == 1
                    ? table.identity().targetComponents().getFirst().column()
                    : null;
        }
        IdStrategy id = table.idStrategy();
        if (id != null && !isBlank(id.column())) {
            return id.column();
        }
        return table.targetKey();
    }

    private static boolean isTargetGenerated(TableMapping table) {
        return table.identity() != null
                && table.identity().policy() == TargetIdentityPolicy.TARGET_GENERATED;
    }

    private static void addColumn(List<String> columns, String candidate) {
        if (columns.stream().noneMatch(column -> column.equalsIgnoreCase(candidate))) {
            columns.add(candidate);
        }
    }

    static String buildInsertSql(String table, List<String> cols, List<String> returningColumns) {
        String base;
        if (cols.isEmpty()) {
            base = "INSERT INTO " + SourceIntrospector.qualifiedIdent(table) + " DEFAULT VALUES";
        } else {
            String colList = String.join(", ", cols.stream().map(SourceIntrospector::ident).toList());
            String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
            base = "INSERT INTO " + SourceIntrospector.qualifiedIdent(table)
                    + " (" + colList + ") VALUES (" + placeholders + ")";
        }
        if (returningColumns.isEmpty()) {
            return base;
        }
        return base + " RETURNING " + String.join(", ", returningColumns.stream()
                .map(SourceIntrospector::ident)
                .toList());
    }

    private static String[] lowerLabels(ResultSetMetaData md) throws SQLException {
        String[] labels = new String[md.getColumnCount()];
        for (int i = 0; i < labels.length; i++) {
            labels[i] = md.getColumnLabel(i + 1).toLowerCase(Locale.ROOT);
        }
        return labels;
    }

    private static Map<String, Object> readRow(ResultSet rs, String[] labels, boolean boundedVariableValues) throws SQLException {
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

    private static long rowBytes(Map<String, Object> row) {
        return row.values().stream().mapToLong(JdbcLobReader::retainedBytes).sum();
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

    private static boolean isJvmFatal(Throwable failure) {
        return failure instanceof VirtualMachineError
                || "java.lang.ThreadDeath".equals(failure.getClass().getName());
    }

    /** checked source failures are wrapped; non-fatal Errors stay visible to the outer sanitize boundary. */
    private static RuntimeException propagate(Throwable failure) {
        if (failure instanceof VirtualMachineError fatal) {
            throw fatal;
        }
        if (failure instanceof RuntimeException runtime) {
            return runtime;
        }
        if (failure instanceof Error error) {
            throw error;
        }
        return new IllegalStateException("migration execution failed");
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
