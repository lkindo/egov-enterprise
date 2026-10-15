package nuri.migration.etl;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.domain.DomainValueRejected;
import nuri.migration.domain.DomainViolation;
import nuri.migration.identity.JdbcTypedValueCodec;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.identity.TypedKeyEncoding;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.keymap.KeyMapRegistry.Checkpoint;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceReadStatements;
import nuri.migration.lookup.LookupMisses;
import nuri.migration.lookup.LookupResolver;
import nuri.migration.lookup.LookupRules;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.mapping.MappingKey;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.Nullify;
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
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
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
 * {@code fkRef} FK 번역(참조 무결성), (5) JDBC 배치 + 청크 트랜잭션(배치 실패 시 행단위로 다시 써 실패 행을 찾는다).
 *
 * <p>[2026-10-13 DEC-OPS-309] 행 변환(transform·codemap·type·fkRef·identity·보호 컬럼) 실패는 격리하지 않는다 —
 * 그 chunk 를 쓰지 않고 테이블과 run 을 멈춘다.
 *
 * <p>[2026-10-14 DEC-OPS-310] 쓰기 단계 실패도 격리하지 않는다. batch 가 실패하면 같은 chunk 를 한 transaction 안에서
 * 행마다 다시 쓴다 — 모두 성공하면 한 번에 커밋하고, 한 행이라도 SQL 오류({@code ATOMIC_WRITE_FAILED})나 재변환
 * 실패({@code ROW_RETRY_TRANSFORM_FAILED})가 나면 chunk 전체를 롤백하고 테이블과 run 을 멈춘다. TARGET_GENERATED
 * 행({@code TARGET_GENERATED_WRITE_FAILED})도 chunk 단위로 커밋한다. 오류는 행 순번과 SQLSTATE 만 밝힌다.
 *
 * <p>[ADR-0029 L3a-1] 표준 도메인 변환기의 거부는 {@code DOMAIN_VIOLATION(<코드>)} 로, 비문자 {@code type} 에 오는
 * 공백 문자는 변환 전에 {@code DOMAIN_VIOLATION(BLANK)} 로 멈춘다. mapping 이 {@code nullify} 로 밝힌 위반만 NULL 로
 * 바꾸고 컬럼별로 세며, 상한을 넘으면 그 chunk 를 롤백하고 {@code NULLIFY_CAP_EXCEEDED} 로 멈춘다.
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
     * 이름과 결과만 담고 키 값은 담지 않는다. {@code nullified} 는 대상 컬럼마다 {@code nullify} 로 NULL 이 된 행 수다
     * (ADR-0029 L3a-1) — 실행마다 표 전체를 다시 읽으므로 표 전체의 수이고, 값은 담지 않는다. {@code mappingId} 는 한
     * 소스를 나눈 매핑의 id 다(ADR-0029 L3c) — 기본 매핑은 null 이다. {@code lookupMisses} 는 {@code at_most_one} 조회
     * 별칭마다 짝이 없어 NULL 을 넣은 행 수다(ADR-0029 L3d) — {@code nullified} 와 같은 범위의 수다.
     */
    public record TableResult(String sourceTable, String targetTable,
                              long read, long transformed, long written, List<String> errors,
                              List<TargetSequenceSynchronizer.SequenceReset> sequenceResets,
                              Map<String, Long> nullified, String mappingId, Map<String, Long> lookupMisses) {

        public TableResult {
            sequenceResets = sequenceResets == null ? List.of() : List.copyOf(sequenceResets);
            nullified = nullified == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(nullified));
            mappingId = mappingId == null || mappingId.isEmpty() ? null : mappingId;
            lookupMisses = lookupMisses == null ? Map.of()
                    : Collections.unmodifiableMap(new LinkedHashMap<>(lookupMisses));
        }

        /** 조회 조인 도입 전 생성자 호환 — 조회하지 않은 매핑이다. */
        public TableResult(String sourceTable, String targetTable,
                           long read, long transformed, long written, List<String> errors,
                           List<TargetSequenceSynchronizer.SequenceReset> sequenceResets,
                           Map<String, Long> nullified, String mappingId) {
            this(sourceTable, targetTable, read, transformed, written, errors, sequenceResets, nullified, mappingId,
                    Map.of());
        }

        /** 매핑 id 도입 전 생성자 호환 — 기본 매핑이다. */
        public TableResult(String sourceTable, String targetTable,
                           long read, long transformed, long written, List<String> errors,
                           List<TargetSequenceSynchronizer.SequenceReset> sequenceResets,
                           Map<String, Long> nullified) {
            this(sourceTable, targetTable, read, transformed, written, errors, sequenceResets, nullified, null);
        }

        /** 시퀀스 재설정 기록 도입 전 생성자 호환. */
        public TableResult(String sourceTable, String targetTable,
                           long read, long transformed, long written, List<String> errors) {
            this(sourceTable, targetTable, read, transformed, written, errors, List.of(), Map.of());
        }

        /** nullify 집계 도입 전 생성자 호환. */
        public TableResult(String sourceTable, String targetTable,
                           long read, long transformed, long written, List<String> errors,
                           List<TargetSequenceSynchronizer.SequenceReset> sequenceResets) {
            this(sourceTable, targetTable, read, transformed, written, errors, sequenceResets, Map.of());
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
        return execute(spec, mode, sourceJt, targetJt, sourceReadPolicy, sourceFreezeAcknowledged, false);
    }

    /**
     * {@code controlSchemaUpgradeAcknowledged}(ADR-0029 L3c)가 있어야 이미 있는 제어 스키마를 이 도구의 버전으로 올린다.
     * 없는데 올려야 하면 COMMIT 은 행을 읽거나 쓰기 전에 멈춘다. 처음 만드는 대상은 확인이 필요 없다.
     */
    public List<TableResult> execute(
            MappingSpec spec,
            MigrationMode mode,
            JdbcTemplate sourceJt,
            JdbcTemplate targetJt,
            SourceReadSessionPolicy sourceReadPolicy,
            boolean sourceFreezeAcknowledged,
            boolean controlSchemaUpgradeAcknowledged
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
        // [ADR-0029 L3c] 매핑 키 중복·keymap 소유 매핑 둘·id 형식 오류는 모드와 무관하게 연결을 열기 전에 멈춘다.
        MappingIndex index = requireMappingIndex(spec.tables());
        // [ADR-0029 L3d] 조회 조인의 선언 오류(id·순서 키 없음, 별칭 미선언 등)도 연결을 열기 전에 멈춘다.
        List<String> lookupViolations = LookupRules.violations(spec.tables());
        if (!lookupViolations.isEmpty()) {
            throw new IllegalArgumentException(lookupViolations.getFirst());
        }
        if (commit) {
            requireCommitContract(spec);
        }
        // 보호 컬럼 선언 위반·키 부재는 연결을 열거나 실행 상태를 만들기 전에 멈춘다(DEC-OPS-308).
        ColumnProtector protector = ColumnProtector.forRun(spec, environment);
        requireNullifyRules(spec);
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
                    initializeCommitState(targetJt, registry, state, spec.tables(),
                            controlSchemaUpgradeAcknowledged);
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
                                initializeCommitState(targetJt, registry, state, spec.tables(),
                                        controlSchemaUpgradeAcknowledged);
                                stateInitialized = true;
                            }
                            boolean sourceSessionFailed = false;
                            tablesRan = true;
                            TableMapping stoppedAt = null;
                            for (TableMapping table : orderedTables) {
                                if (stoppedAt != null) {
                                    // [2026-10-13 DEC-OPS-309·2026-10-14 DEC-OPS-310] 앞 테이블의 행 변환·쓰기 실패로 run 을 멈췄다.
                                    //   남은 테이블은 읽지도 쓰지도 않고, 처리하지 않았다는 사실을 결과에 남긴다.
                                    results.add(notProcessed(table, stoppedAt, state));
                                    continue;
                                }
                                TableExecution execution = runTable(
                                        sourceConnection, targetDs, spec, index, table, registry, state, commit,
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
        // [ADR-0029 L3c] 결과와 재설정 대상은 매핑 라벨로 잇는다 — 한 소스를 나눈 두 매핑의 재설정이 서로 섞이지 않는다.
        Set<String> ranTables = new HashSet<>();
        for (TableResult result : results) {
            ranTables.add(resultLabel(result));
        }
        try (Connection target = targetDs.getConnection()) {
            for (TargetSequenceSynchronizer.Target planned : plan) {
                String table = planned.mapping().toLowerCase(Locale.ROOT);
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
                String table = planned.mapping().toLowerCase(Locale.ROOT);
                if (ranTables.contains(table)) {
                    failures.computeIfAbsent(table, ignored -> new ArrayList<>())
                            .add(sequenceFailure(planned, "SQL_EXECUTION_FAILED"));
                }
            }
        }
        for (int i = 0; i < results.size(); i++) {
            TableResult result = results.get(i);
            String table = resultLabel(result);
            if (!resets.containsKey(table) && !failures.containsKey(table)) {
                continue;
            }
            List<String> errors = new ArrayList<>(result.errors());
            errors.addAll(failures.getOrDefault(table, List.of()));
            results.set(i, new TableResult(result.sourceTable(), result.targetTable(), result.read(),
                    result.transformed(), result.written(), errors, resets.getOrDefault(table, List.of()),
                    result.nullified(), result.mappingId(), result.lookupMisses()));
        }
    }

    /** 결과의 매핑 라벨(소문자). {@link TargetSequenceSynchronizer.Target#mapping} 과 같은 규칙이다. */
    private static String resultLabel(TableResult result) {
        String label = result.mappingId() == null ? result.sourceTable() : result.sourceTable() + "#" + result.mappingId();
        return label.toLowerCase(Locale.ROOT);
    }

    private static String sequenceFailure(TargetSequenceSynchronizer.Target planned, String reason) {
        return "시퀀스 재설정 실패(" + planned.targetTable() + "." + planned.column() + "): " + reason;
    }

    /**
     * 제어 스키마를 만들거나(확인이 있으면) 올리고, 기존 keymap·checkpoint 를 읽는다. 재개 가드(ADR-0029 L3c)가 이 run 의
     * checkpoint 에 있는데 mapping 에 없는 매핑 id 를 찾으면 run 상태를 바꾸거나 행을 쓰기 전에 멈춘다.
     */
    private static void initializeCommitState(
            JdbcTemplate target,
            KeyMapRegistry registry,
            MigrationStateStore state,
            List<TableMapping> declared,
            boolean controlSchemaUpgradeAcknowledged
    ) {
        new MigrationSchemaManager().migrateAndValidate(target, controlSchemaUpgradeAcknowledged);
        registry.preload(target); // 재실행 멱등: 기존 대응 재사용
        state.initialize(target, declared);
    }

    /** 매핑 색인 오류를 고정 어휘로 알린다. 문구는 소스 표기·매핑 id 뿐이다. */
    private static MappingIndex requireMappingIndex(List<TableMapping> tables) {
        MappingIndex index = MappingIndex.of(tables);
        if (!index.errors().isEmpty()) {
            throw new IllegalArgumentException(index.errors().getFirst());
        }
        return index;
    }

    /** 결과·문구에서 매핑을 가리는 라벨. 기본 매핑은 소스 표기 그대로다. */
    private static String label(TableMapping table) {
        return MappingIndex.label(table);
    }

    /** 결과에 싣는 매핑 id. 기본 매핑은 null 이다(실행 증거에 싣지 않는다). */
    private static String resultMappingId(TableMapping table) {
        return table.id();
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
        MappingIndex index = MappingIndex.of(spec.tables());
        for (TableMapping table : spec.tables()) {
            validateIdentityContract(spec, index, table);
            if (!isBlank(table.orderBy()) && !table.orderByKeys().isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": orderBy와 orderByKeys를 함께 선언할 수 없습니다");
            }
            List<String> orderKeys = table.effectiveOrderKeys();
            if (orderKeys.isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": commit 모드에는 명시적 orderBy/orderByKeys source key가 필수입니다");
            }
            Set<String> distinct = new HashSet<>();
            for (String orderKey : orderKeys) {
                SourceIntrospector.ident(orderKey);
                if (!distinct.add(orderKey.toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException(label(table)
                            + ": orderByKeys 중복 금지: " + orderKey);
                }
            }
            if (table.identity() == null) {
                String targetIdentity = targetIdentityColumn(table);
                if (isBlank(targetIdentity)) {
                    throw new IllegalArgumentException(label(table)
                            + ": checkpoint/verifier용 targetKey 또는 idStrategy.column이 필수입니다");
                }
                SourceIntrospector.ident(targetIdentity);
            }
        }
    }

    /**
     * nullify 선언을 연결을 열기 전에 확인한다(ADR-0029 L3a-1). {@code BLANK}·{@code PLACEHOLDER_DATE} 만, 위반마다 한 번,
     * 상한은 1 이상이어야 한다 — 그 밖의 선언으로 위반을 NULL 로 바꾸지 않는다. 오류는 테이블·컬럼 이름만 밝힌다.
     */
    static void requireNullifyRules(MappingSpec spec) {
        for (TableMapping table : spec.tables()) {
            for (ColumnMapping column : table.columns()) {
                Set<DomainViolation> declared = EnumSet.noneOf(DomainViolation.class);
                for (Nullify rule : column.nullify()) {
                    String label = label(table) + "." + column.target();
                    if (rule == null || (rule.violation() != DomainViolation.BLANK
                            && rule.violation() != DomainViolation.PLACEHOLDER_DATE)) {
                        throw new IllegalArgumentException(label
                                + ": nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
                    }
                    if (rule.maxRows() == null || rule.maxRows() < 1) {
                        throw new IllegalArgumentException(label + ": nullify maxRows 는 1 이상이어야 합니다");
                    }
                    if (!declared.add(rule.violation())) {
                        throw new IllegalArgumentException(label + ": nullify 에 같은 위반을 두 번 선언할 수 없습니다");
                    }
                }
            }
        }
    }

    private static void validateIdentityContract(MappingSpec spec, MappingIndex index, TableMapping table) {
        IdentityStrategy identity = table.identity();
        if (identity == null) {
            if (!table.foreignKeys().isEmpty()) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreignKeys에는 typed identity가 필수입니다");
            }
            return;
        }
        if (table.idStrategy() != null) {
            throw new IllegalArgumentException(label(table)
                    + ": legacy idStrategy와 typed identity를 함께 선언할 수 없습니다");
        }
        requireComponents(label(table), "sourceComponents", identity.sourceComponents());
        requireComponents(label(table), "targetComponents", identity.targetComponents());
        if (identity.policy() == TargetIdentityPolicy.PRESERVE
                && identity.sourceComponents().size() != identity.targetComponents().size()) {
            throw new IllegalArgumentException(label(table) + ": PRESERVE identity arity 불일치");
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
                    throw new IllegalArgumentException(label(table)
                            + ": REMAP target identity component 값 생성 mapping 없음: "
                            + target.column());
                }
            }
        }
        if (identity.policy() == TargetIdentityPolicy.TARGET_GENERATED
                && (spec.target() == null || spec.target().url() == null
                || !spec.target().url().toLowerCase(Locale.ROOT).startsWith("jdbc:postgresql:"))) {
            throw new IllegalArgumentException(label(table)
                    + ": TARGET_GENERATED는 PostgreSQL INSERT ... RETURNING target에서만 지원됩니다");
        }
        for (CompositeForeignKey foreignKey : table.foreignKeys()) {
            requireComponents(label(table), "foreignKeys.sourceComponents", foreignKey.sourceComponents());
            requireComponents(label(table), "foreignKeys.targetComponents", foreignKey.targetComponents());
            if (foreignKey.sourceComponents().size() != foreignKey.targetComponents().size()) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreign key source/target arity 불일치");
            }
            // [ADR-0029 L3c] 부모 소스는 그 소스의 keymap 소유 매핑으로 푼다.
            TableMapping parent = index.parent(foreignKey.parentSource());
            if (parent == null) {
                throw new IllegalArgumentException(label(table)
                        + ": composite foreign key parent mapping 없음: " + foreignKey.parentSource());
            }
            if (parent.identity() == null
                    || !sameOrderedTypes(
                            parent.identity().sourceComponents(), foreignKey.sourceComponents())
                    || !sameOrderedTypes(
                            parent.identity().targetComponents(), foreignKey.targetComponents())) {
                throw new IllegalArgumentException(label(table)
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

    /**
     * 복합 FK 의 부모(소스의 keymap 소유 매핑, ADR-0029 L3c)가 자식보다 먼저 실행되는지 본다. 부모가 자기 자신이면
     * 생성 identity 선채번이 안전하지 않아 막는다. 소유 매핑이 아닌 매핑이 자기 소스를 가리키면 형제 소유 매핑이 부모다.
     */
    static void requireCompositeForeignKeyOrder(List<TableMapping> orderedTables) {
        MappingIndex index = MappingIndex.of(orderedTables);
        Map<MappingKey, Integer> order = new LinkedHashMap<>();
        for (int i = 0; i < orderedTables.size(); i++) {
            MappingKey key = index.key(orderedTables.get(i));
            if (key != null) {
                order.put(key, i);
            }
        }
        for (int childIndex = 0; childIndex < orderedTables.size(); childIndex++) {
            TableMapping child = orderedTables.get(childIndex);
            for (CompositeForeignKey foreignKey : child.foreignKeys()) {
                if (index.resolvesTo(foreignKey.parentSource(), child)) {
                    throw new IllegalArgumentException(label(child)
                            + ": typed composite self reference is blocked; generated identity pre-mint is unsafe");
                }
                MappingKey parent = index.key(index.parent(foreignKey.parentSource()));
                Integer parentIndex = parent == null ? null : order.get(parent);
                if (parentIndex == null || parentIndex >= childIndex) {
                    throw new IllegalArgumentException(label(child)
                            + ": composite foreign key requires explicit parent-first order: "
                            + foreignKey.parentSource());
                }
            }
        }
    }

    private TableExecution runTable(Connection sourceConnection, DataSource targetDs, MappingSpec spec,
                                    MappingIndex index, TableMapping t, KeyMapRegistry reg,
                                    MigrationStateStore state, boolean commit, ColumnProtector protector) {
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
            preMintSelfReferences(sourceConnection, targetConn, index, t, reg);
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
            errors.add("이관 실패(" + label(t) + "): " + reason);
            safeRollback(targetConn);
        } catch (Throwable failure) {
            safeRollback(targetConn);
            throw propagate(failure);
        } finally {
            safeClose(targetConn);
        }
        long durableWritten = state == null ? counts.written : state.count(t.source(), t.effectiveId());
        return new TableExecution(
                new TableResult(t.source(), t.target(), counts.read, counts.transformed, durableWritten, errors,
                        List.of(), counts.nullified.columns(), resultMappingId(t), counts.lookupMisses.counts()),
                sourceSessionFailed, rowFailureStopped);
    }

    /** 행 변환·쓰기 실패로 run 이 멈춘 뒤의 테이블. 앞서 커밋된 checkpoint 수만 기록 건수로 보인다. */
    private static TableResult notProcessed(TableMapping table, TableMapping stoppedAt,
                                            MigrationStateStore state) {
        long durableWritten = state == null ? 0L : state.count(table.source(), table.effectiveId());
        return new TableResult(table.source(), table.target(), 0L, 0L, durableWritten,
                List.of("적재 중단으로 처리하지 않음(" + label(table) + "): 앞 테이블 "
                        + label(stoppedAt) + " 의 행 실패 — RUN_STOPPED_BY_ROW_FAILURE"),
                List.of(), Map.of(), resultMappingId(table));
    }

    /**
     * COMMIT 을 시작하기 전에 순서 키 튜플의 유일성을, [ADR-0029 L3d] 그다음 조회 표(where 적용)의 조회 키 유일성을 같은
     * 읽기 트랜잭션에서 증명한다. 증명하지 못하면 행을 읽거나 쓰기 전에 멈춘다.
     */
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
                        List.of("이관 실패(" + label(table) + "): SQL_EXECUTION_FAILED"),
                        List.of(), Map.of(), resultMappingId(table));
            }
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
                            List.of(), Map.of(), resultMappingId(table));
                }
            }
        }
        return null;
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
        if (!table.lookups().isEmpty()) {
            // [ADR-0029 L3d] 열린 결과를 읽는 동안 조회 문장을 보낼 수 없다. 규칙(LookupRules)이 먼저 막는다.
            throw new IllegalStateException(label(table) + ": 조회 조인에는 순서 키가 필요합니다");
        }
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
                        if (!processChunk(chunk, ChunkLookups.NONE, spec, table, writePlan, registry, state,
                                target, counts, errors)) {
                            return false;
                        }
                        chunk.clear();
                        retainedBytes = 0;
                    }
                }
                if (!chunk.isEmpty()) {
                    return processChunk(chunk, ChunkLookups.NONE, spec, table, writePlan, registry, state,
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
            // [ADR-0029 L3d] 페이지를 다 읽어 결과를 닫은 뒤, 같은 연결·같은 읽기 트랜잭션에서 조회 표를 읽는다.
            ChunkLookups lookups = accepted.isEmpty() ? ChunkLookups.NONE : resolveLookups(source, table, accepted);
            if (!accepted.isEmpty()
                    && !processChunk(accepted, lookups, spec, table, writePlan, registry, state,
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

    /**
     * [ADR-0029 L3d] chunk 의 조회 키로 조회 표를 읽어 행에 {@code alias.column} 값을 넣고 행마다 조회 결과를 남긴다. 조회
     * 표는 키 IN 조건으로 {@link LookupResolver#MAX_KEYS_PER_QUERY} 개씩 같은 연결·같은 읽기 트랜잭션에서 읽는다. 멈출 행은
     * 그 행의 처리 차례에 {@link ChunkLookups#check} 가 알린다 — chunk 의 앞 행이 다른 이유로 먼저 실패하면 그쪽이 먼저다.
     */
    private ChunkLookups resolveLookups(Connection source, TableMapping table, List<Map<String, Object>> rows)
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

    /** 조회 표에서 이 키들의 행을 읽는다. 키 값은 바인딩하고 문구에 싣지 않는다. */
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
    private static final class ChunkLookups {
        static final ChunkLookups NONE = new ChunkLookups(new IdentityHashMap<>());

        private final Map<Map<String, Object>, List<RowLookup>> rows;

        private ChunkLookups(Map<Map<String, Object>, List<RowLookup>> rows) {
            this.rows = rows;
        }

        /** 이 행의 조회가 멈추게 하면 그 사유로, 짝 없는 행이 상한을 넘으면 {@code LOOKUP_MISSING_CAP_EXCEEDED} 로 멈춘다. */
        void check(Map<String, Object> row, LookupMisses misses) {
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
                if (outcome.missed() && !misses.add(lookup.alias(), lookup.maxMissing())) {
                    throw new RowTransformFailure(lookup.alias(), RowFailureReason.LOOKUP_MISSING_CAP_EXCEEDED);
                }
            }
        }
    }

    private record TableExecution(TableResult result, boolean sourceSessionFailed,
                                  boolean rowFailureStopped) {}

    private static final class TableCounts {
        private long read;
        private long transformed;
        private long written;
        private final NullifyTally nullified = new NullifyTally();
        private final LookupMisses lookupMisses = new LookupMisses();
    }

    /** 한 행에서 nullify 로 NULL 이 된 컬럼과 위반. 값은 담지 않는다. */
    private record Nullified(String column, DomainViolation violation, long maxRows) {}

    /**
     * 표 하나에서 nullify 로 NULL 이 된 값의 수(ADR-0029 L3a-1). 실행마다 표 전체를 다시 읽으므로 끝까지 적재한 실행의
     * 집계가 곧 표 집계다 — 이미 커밋된 행도 checkpoint 대조를 위해 다시 변환되며 함께 센다. 멈춘 실행의 집계는
     * {@code transformed} 처럼 변환한 행의 수라 롤백한 chunk 의 앞선 행도 들어 있다. 쓰기 재시도의 재변환은 세지 않는다.
     */
    private static final class NullifyTally {
        private final Map<String, Long> columns = new LinkedHashMap<>();
        private final Map<RuleKey, Long> rules = new HashMap<>();

        /**
         * 변환에 성공한 행 하나의 정제를 더한다. 위반의 상한을 넘으면 그 컬럼과 위반만 밝혀 멈추고, 그 행은 세지 않는다
         * — 집계는 상한을 넘지 않는다. 한 행에서 같은 컬럼은 한 번만 NULL 이 되므로 규칙 키도 행 안에서 겹치지 않는다.
         */
        void add(List<Nullified> row) {
            for (Nullified nullified : row) {
                long count = rules.getOrDefault(new RuleKey(nullified.column(), nullified.violation()), 0L) + 1;
                if (count > nullified.maxRows()) {
                    throw new RowTransformFailure(nullified.column(), RowFailureReason.NULLIFY_CAP_EXCEEDED,
                            nullified.violation().name());
                }
            }
            for (Nullified nullified : row) {
                columns.merge(nullified.column(), 1L, Long::sum);
                rules.merge(new RuleKey(nullified.column(), nullified.violation()), 1L, Long::sum);
            }
        }

        Map<String, Long> columns() {
            return columns;
        }

        private record RuleKey(String column, DomainViolation violation) {}
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

    /**
     * 자기참조 매핑의 키를 먼저 채번한다. [ADR-0029 L3c] 자기참조는 fkRef 가 자기 소스를 가리키고 그 소스의 부모(keymap
     * 소유 매핑)가 이 매핑일 때뿐이다. 소유 매핑이 아닌 매핑이 자기 소스를 가리키면 형제 소유 매핑의 keymap 을 번역할
     * 뿐이라(실행 순서가 소유 매핑을 먼저 둔다) 선채번하지 않는다.
     */
    private void preMintSelfReferences(Connection sourceConnection, Connection targetConn, MappingIndex index,
                                       TableMapping table, KeyMapRegistry registry) throws SQLException {
        boolean selfReference = table.columns().stream().anyMatch(column ->
                !isBlank(column.fkRef()) && index.sameSource(table, column.fkRef())
                        && (index.parent(column.fkRef()) == null || index.resolvesTo(column.fkRef(), table)));
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
     * [2026-10-14 DEC-OPS-310] 쓰기 단계 실패도 같다 — 이 chunk 는 한 행도 커밋하지 않고 멈춘다.
     *
     * @return 계속 진행하면 true, 행 변환·쓰기 실패로 멈추면 false
     */
    private boolean processChunk(List<Map<String, Object>> chunk, ChunkLookups lookups, MappingSpec spec,
                                 TableMapping t, WritePlan writePlan, KeyMapRegistry reg,
                                 MigrationStateStore state, Connection targetConn,
                                 TableCounts counts, List<String> errors) {
        long firstOrdinal = counts.read - chunk.size() + 1;
        if (isTargetGenerated(t)) {
            return processGeneratedRows(chunk, lookups, spec, t, writePlan, reg, state, targetConn, counts, errors,
                    firstOrdinal);
        }
        Checkpoint chunkCheckpoint = reg.checkpoint();
        List<PreparedRow> batch = new ArrayList<>(chunk.size());
        for (int index = 0; index < chunk.size(); index++) {
            Map<String, Object> row = chunk.get(index);
            Checkpoint rowCheckpoint = reg.checkpoint();
            try {
                lookups.check(row, counts.lookupMisses);
                Map<String, Object> out = transformRow(row, spec, t, reg, writePlan.protector(), counts.nullified);
                counts.transformed++;
                CheckpointEntry checkpoint = null;
                if (state != null) {
                    checkpoint = identityCheckpoint(row, out, t, writePlan.targetColumns());
                    CheckpointEntry durable = state.find(t.source(), t.effectiveId(), checkpoint.sourceKey());
                    if (durable != null) {
                        if (t.identity() != null
                                && reg.checkpoint().pendingSize() > rowCheckpoint.pendingSize()) {
                            reg.rollback(chunkCheckpoint);
                            errors.add("resume checkpoint/keymap missing for durable typed identity("
                                    + label(t) + ", sourceDigest="
                                    + KeyDiagnostics.digest(checkpoint.sourceKey()) + ")");
                            return false;
                        }
                        if (!durable.rowChecksum().equals(checkpoint.rowChecksum())
                                || !durable.targetKey().equals(checkpoint.targetKey())
                                || !durable.targetTable().equalsIgnoreCase(checkpoint.targetTable())) {
                            reg.rollback(chunkCheckpoint);
                            errors.add("resume checkpoint/source checksum 불일치(" + label(t)
                                    + ", sourceDigest=" + KeyDiagnostics.digest(checkpoint.sourceKey()) + ")");
                            return false;
                        }
                        reg.rollback(rowCheckpoint);
                        continue;
                    }
                }
                batch.add(new PreparedRow(row, toArguments(out, writePlan.insertColumns()), checkpoint,
                        firstOrdinal + index));
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
        WriteOutcome outcome = writeChunkAtomically(
                targetConn, writePlan.insertSql(), batch, spec, t, writePlan, reg, state,
                chunkCheckpoint, errors);
        counts.written += outcome.written();
        return outcome.completed();
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
        return "행 변환 실패(" + label(table) + ", column=" + column + ", row=" + ordinal
                + "): ROW_TRANSFORM_FAILED:" + reason.name() + detail
                + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다";
    }

    /** 행 변환이 어느 단계에서 실패했는지. 값은 담지 않는다. */
    enum RowFailureReason {
        TRANSFORM_FAILED,
        /** 표준 도메인 변환기 또는 비문자 type 의 공백 판정이 거부했다. detail 은 위반 코드다(ADR-0029 L3a-1). */
        DOMAIN_VIOLATION,
        /** nullify 로 NULL 이 된 행이 그 위반의 maxRows 를 넘었다. detail 은 위반 코드다. */
        NULLIFY_CAP_EXCEEDED,
        CODEMAP_UNDEFINED,
        CODEMAP_UNMAPPED,
        CODEMAP_INPUT_INVALID,
        TYPE_CONVERSION_FAILED,
        FK_REF_ORPHAN,
        FK_REF_FAILED,
        IDENTITY_FAILED,
        PROTECTED_COLUMN,
        /** 조회 키가 같은 조회 행이 둘 이상이다(ADR-0029 L3d). column 은 조회 별칭이다. */
        LOOKUP_FANOUT,
        /** exactly_one 조회에 짝이 없거나 키가 비었다. */
        LOOKUP_MISSING,
        /** at_most_one 조회의 짝 없는 행이 maxMissing 을 넘었다. */
        LOOKUP_MISSING_CAP_EXCEEDED,
        /** 조회 키 값이 문자·정수·고정소수가 아니다. */
        LOOKUP_KEY_TYPE,
        /** DB 가 돌려준 조회 행의 키가 요청한 키와 정규화해 같지 않다 — DB 비교 의미(collation·뒤 공백)가 다르다. */
        LOOKUP_KEY_MISMATCH,
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

    /**
     * 쓰기 단계 실패를 대상 테이블과 행 위치, SQLSTATE 로만 밝힌다. 예외 원문에는 값이 들어갈 수 있어 싣지 않는다.
     * {@code ordinal} 이 0 이하이면 특정 행이 아니라 chunk 의 keymap·checkpoint 기록 실패다.
     */
    static String writeFailureMessage(TableMapping table, long ordinal, String code, Throwable failure) {
        String row = ordinal > 0 ? Long.toString(ordinal) : "-";
        return "행 쓰기 실패(" + label(table) + ", target=" + table.target() + ", row=" + row + "): " + code
                + "(SQLSTATE=" + sqlState(failure) + ") — 이 chunk 는 기록하지 않고 적재를 멈췄습니다";
    }

    /** SQLSTATE 는 5자리 영숫자 코드만 싣는다. 값이 들어갈 수 있는 다른 문자열은 버린다. */
    static String sqlState(Throwable failure) {
        for (Throwable current = failure; current != null; current = current.getCause()) {
            if (current instanceof SQLException sql && sql.getSQLState() != null
                    && sql.getSQLState().matches("[0-9A-Z]{5}")) {
                return sql.getSQLState();
            }
        }
        return "-";
    }

    private record PreparedRow(Map<String, Object> source, Object[] arguments,
                               CheckpointEntry checkpoint, long ordinal) {}

    /** chunk 쓰기 결과. {@code completed} 가 false 면 이 chunk 는 커밋하지 않았고 run 을 멈춘다. */
    private record WriteOutcome(long written, boolean completed) {}

    /**
     * generated identity는 JDBC batch가 반환값을 증명하지 못하므로 행별 INSERT ... RETURNING 경로만 사용한다.
     *
     * <p>[2026-10-13 DEC-OPS-309] chunk 의 모든 행을 먼저 변환한 뒤에 쓴다. 한 행이라도 변환에 실패하면 이 chunk 의
     * 어느 행도 쓰지 않고 멈춘다.
     *
     * <p>[2026-10-14 DEC-OPS-310] 쓰기도 chunk 를 한 transaction 으로 커밋한다. 한 행이라도 INSERT RETURNING·keymap·
     * checkpoint 기록에 실패하면 chunk 전체를 롤백하고 멈춘다.
     *
     * @return 계속 진행하면 true, 행 변환·쓰기 실패로 멈추면 false
     */
    private boolean processGeneratedRows(
            List<Map<String, Object>> rows,
            ChunkLookups lookups,
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
                    lookups.check(rows.get(index), counts.lookupMisses);
                    transformRow(rows.get(index), spec, table, registry, writePlan.protector(), counts.nullified);
                    counts.transformed++;
                } catch (RuntimeException failure) {
                    errors.add(rowFailureMessage(table, failure, firstOrdinal + index));
                    completed = false;
                    break;
                } finally {
                    registry.rollback(checkpoint);
                }
            }
            errors.add(label(table)
                    + ": TARGET_GENERATED dry-run은 DB 생성 identity를 materialize할 수 없습니다");
            return completed;
        }

        Checkpoint chunkCheckpoint = registry.checkpoint();
        List<GeneratedRow> prepared = new ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            Map<String, Object> row = rows.get(index);
            Checkpoint rowCheckpoint = registry.checkpoint();
            try {
                lookups.check(row, counts.lookupMisses);
                Map<String, Object> transformed = transformRow(
                        row, spec, table, registry, writePlan.protector(), counts.nullified);
                TypedKeyTuple sourceIdentity = tupleFromValues(row, table.identity().sourceComponents());
                counts.transformed++;
                String encodedSource = TypedKeyEncoding.encode(
                        sourceIdentity, 256, "tb_migration_checkpoint.source_key");
                CheckpointEntry durable = state.find(table.source(), table.effectiveId(), encodedSource);
                if (durable != null) {
                    if (!TypedKeyEncoding.isTyped(durable.targetKey())) {
                        throw new IllegalStateException(table.source()
                                + ": typed identity checkpoint target_key가 legacy 형식입니다");
                    }
                    TypedKeyTuple durableTarget = TypedKeyEncoding.decode(durable.targetKey());
                    TypedKeyTuple mappedTarget = registry.translate(table.source(), sourceIdentity);
                    if (mappedTarget == null) {
                        registry.rollback(chunkCheckpoint);
                        errors.add("resume checkpoint/keymap missing for durable generated identity("
                                + label(table) + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                        return false;
                    }
                    if (!mappedTarget.equals(durableTarget)) {
                        registry.rollback(chunkCheckpoint);
                        errors.add("resume checkpoint/keymap mismatch for durable generated identity("
                                + label(table) + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                        return false;
                    }
                    applyTargetIdentity(transformed, table.identity().targetComponents(), durableTarget);
                    CheckpointEntry expected = checkpoint(
                            row, transformed, table, writePlan.targetColumns());
                    if (!durable.rowChecksum().equals(expected.rowChecksum())
                            || !durable.targetKey().equals(expected.targetKey())
                            || !durable.targetTable().equalsIgnoreCase(expected.targetTable())) {
                        registry.rollback(chunkCheckpoint);
                        errors.add("resume checkpoint/source checksum 불일치(" + label(table)
                                + ", sourceDigest=" + KeyDiagnostics.digest(encodedSource) + ")");
                        return false;
                    }
                    registry.rollback(rowCheckpoint);
                    continue;
                }
                prepared.add(new GeneratedRow(row, transformed, sourceIdentity, firstOrdinal + index));
            } catch (RuntimeException failure) {
                registry.rollback(chunkCheckpoint);
                errors.add(rowFailureMessage(table, failure, firstOrdinal + index));
                return false;
            }
        }

        if (prepared.isEmpty()) {
            registry.rollback(chunkCheckpoint);
            return true;
        }
        List<CheckpointEntry> durableCheckpoints = new ArrayList<>(prepared.size());
        long ordinal = 0L;
        try {
            for (GeneratedRow candidate : prepared) {
                ordinal = candidate.ordinal();
                Map<String, Object> transformed = candidate.transformed();
                TypedKeyTuple generated = executeReturning(
                        connection,
                        writePlan.insertSql(),
                        toArguments(transformed, writePlan.insertColumns()),
                        table.identity().targetComponents());
                applyTargetIdentity(transformed, table.identity().targetComponents(), generated);
                registry.register(table.source(), candidate.sourceIdentity(), generated);
                durableCheckpoints.add(checkpoint(
                        candidate.source(), transformed, table, writePlan.targetColumns()));
            }
            ordinal = 0L;
            registry.writePending(connection, chunkCheckpoint);
            state.write(connection, durableCheckpoints);
        } catch (SQLException | RuntimeException failure) {
            rollbackAndDiscard(connection, registry, chunkCheckpoint, table.target());
            errors.add(writeFailureMessage(table, ordinal,
                    "TARGET_GENERATED_WRITE_FAILED:INSERT_RETURNING/keymap/checkpoint", failure));
            return false;
        }
        commitAndAccept(connection, registry, chunkCheckpoint, state, durableCheckpoints, table.target());
        counts.written += prepared.size();
        return true;
    }

    private record GeneratedRow(Map<String, Object> source, Map<String, Object> transformed,
                                TypedKeyTuple sourceIdentity, long ordinal) {}

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
                    RowChecksum.calculate(targetColumns, transformed),
                    table.effectiveId());
        }
        String sourceKey = sourceKey(source, table);
        Object targetValue = transformed.get(targetIdentityColumn(table));
        if (targetValue == null || targetValue.toString().isBlank()) {
            throw new IllegalStateException(table.source() + ": target identity가 null/blank입니다");
        }
        return new CheckpointEntry(table.source(), sourceKey, table.target(), targetValue.toString(),
                RowChecksum.calculate(targetColumns, transformed), table.effectiveId());
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

    /**
     * 행 하나를 대상 컬럼 값으로 바꾼다. {@code tally} 가 있으면 nullify 정제를 세고 상한을 확인한다 — 쓰기 재시도의
     * 재변환은 같은 행을 두 번 세지 않도록 null 을 넘긴다(정제 자체는 똑같이 한다).
     */
    private Map<String, Object> transformRow(Map<String, Object> src, MappingSpec spec, TableMapping t,
                                             KeyMapRegistry reg, ColumnProtector protector, NullifyTally tally) {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Nullified> nullified = new ArrayList<>(0);
        for (ColumnMapping col : t.columns()) {
            Object value;
            if (col.constant() != null) {
                value = col.constant();
            } else if (col.source() != null) {
                value = columnValue(src.get(col.source().toLowerCase(Locale.ROOT)), spec, col, reg, nullified);
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
        if (tally != null) {
            tally.add(nullified);
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
     *
     * <p>[ADR-0029 L3a-1] 표준 도메인 변환기의 거부는 위반 코드로 남긴다. 비문자 {@code type} 에 공백 문자가 오면 변환
     * 전에 {@code BLANK} 위반이다(제어 문자뿐이면 {@code FORMAT}) — 종전에는 {@link TypeConverter} 가 조용히 NULL 로
     * 바꿨다. 두 경우 모두 mapping 이 {@code nullify} 로 그 위반을 밝혔을 때만 NULL 로 바꾸고 {@code nullified} 에 남긴다.
     * 내장 {@code date}·{@code timestamp} 가 표기를 읽지 못하면 {@code TRANSFORM_FAILED(FORMAT)} 이다.
     */
    private Object columnValue(Object sourceValue, MappingSpec spec, ColumnMapping col, KeyMapRegistry reg,
                               List<Nullified> nullified) {
        Object value;
        try {
            value = transformers.apply(col.transform(), sourceValue);
        } catch (DomainValueRejected rejected) {
            if (!transformers.isDomain(col.transform())) {
                // 사용자 변환기가 던진 위반 코드는 인정하지 않는다 — nullify·격리 어휘를 위조하지 못하게 한다.
                throw new RowTransformFailure(col.target(), RowFailureReason.TRANSFORM_FAILED);
            }
            value = nullifyOrReject(col, rejected.violation(), nullified);
        } catch (RuntimeException failure) {
            throw new RowTransformFailure(col.target(), RowFailureReason.TRANSFORM_FAILED,
                    builtinParseFailure(col.transform(), sourceValue));
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
        DomainViolation typeViolation = TypeConverter.isNonTextType(col.type()) ? emptyText(value) : null;
        if (typeViolation != null) {
            value = nullifyOrReject(col, typeViolation, nullified);
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

    /** 선언한 nullify 가 있으면 NULL 로 바꾸고 기록한다. 없으면 위반 코드만 밝혀 멈춘다. */
    private static Object nullifyOrReject(ColumnMapping col, DomainViolation violation, List<Nullified> nullified) {
        for (Nullify rule : col.nullify()) {
            if (rule.violation() == violation) {
                nullified.add(new Nullified(col.target(), violation, rule.maxRows()));
                return null;
            }
        }
        throw new RowTransformFailure(col.target(), RowFailureReason.DOMAIN_VIOLATION, violation.name());
    }

    /**
     * type 경로에서 {@link TypeConverter} 가 조용히 NULL 로 바꿀 문자(trim 결과가 빈 문자열)의 위반. 프로파일러가 공백으로
     * 세는 문자(isBlank)만 {@code BLANK} 다. NUL 채움처럼 제어 문자만 있는 값은 프로파일러·추정기·도메인 변환기가 모두
     * 형식 위반으로 보므로 {@code FORMAT} 이고, nullify 로 NULL 이 되지 않는다. 문자가 아닌 값과 나머지는 null 이다.
     */
    static DomainViolation emptyText(Object value) {
        if (!(value instanceof CharSequence) && !(value instanceof Character)) {
            return null;
        }
        String text = value.toString();
        if (text.isBlank()) {
            return DomainViolation.BLANK;
        }
        return text.trim().isEmpty() ? DomainViolation.FORMAT : null;
    }

    /**
     * 내장 {@code date}·{@code timestamp} 가 문자·숫자 값의 표기를 읽지 못한 실패의 사유({@code FORMAT}). 격리 어휘가 이
     * 사유로 형식 위반을 가린다(설계서 격리 어휘 대응표). 사용자 변환기·그 밖의 값 종류의 실패는 사유 없이 남겨 격리할 수
     * 없게 한다. 값은 싣지 않는다.
     */
    private String builtinParseFailure(String transform, Object sourceValue) {
        boolean parser = "date".equals(transform) || "timestamp".equals(transform);
        boolean text = sourceValue instanceof CharSequence || sourceValue instanceof Character
                || sourceValue instanceof Number;
        return parser && text && transformers.isBuiltin(transform) ? DomainViolation.FORMAT.name() : null;
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

    private WriteOutcome writeChunkAtomically(Connection connection, String sql, List<PreparedRow> rows,
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
        return new WriteOutcome(written, true);
    }

    /**
     * batch 가 실패한 chunk 를 같은 transaction 안에서 행마다 다시 쓴다. 드라이버가 batch 결과를 증명하지 못한
     * 경우처럼 행마다 쓰면 성공하는 chunk 는 그대로 한 번에 커밋한다. 한 행이라도 실패하면 chunk 전체를
     * 롤백하고 처음 실패한 행만 밝힌 뒤 멈춘다 — 그 행을 빼고 나머지를 커밋하지 않는다(DEC-OPS-310).
     */
    private WriteOutcome writeRowsAtomically(Connection connection, String sql, List<PreparedRow> rows,
                                             MappingSpec spec, TableMapping table, WritePlan writePlan,
                                             KeyMapRegistry registry, MigrationStateStore state,
                                             List<String> errors) {
        Checkpoint chunkCheckpoint = registry.checkpoint();
        List<CheckpointEntry> checkpoints = new ArrayList<>(rows.size());
        long written = 0L;
        for (PreparedRow row : rows) {
            Object[] arguments;
            try {
                Map<String, Object> transformed = transformRow(
                        row.source(), spec, table, registry, writePlan.protector(), null);
                arguments = toArguments(transformed, writePlan.insertColumns());
                checkpoints.add(checkpoint(row.source(), transformed, table, writePlan.targetColumns()));
            } catch (RuntimeException failure) {
                rollbackAndDiscard(connection, registry, chunkCheckpoint, table.target());
                errors.add(writeFailureMessage(table, row.ordinal(), "ROW_RETRY_TRANSFORM_FAILED", failure));
                return new WriteOutcome(0L, false);
            }
            try {
                written += executeSingle(connection, sql, arguments);
            } catch (SQLException failure) {
                rollbackAndDiscard(connection, registry, chunkCheckpoint, table.target());
                errors.add(writeFailureMessage(table, row.ordinal(), "ATOMIC_WRITE_FAILED", failure));
                return new WriteOutcome(0L, false);
            }
        }
        try {
            registry.writePending(connection, chunkCheckpoint);
            state.write(connection, checkpoints);
        } catch (SQLException failure) {
            rollbackAndDiscard(connection, registry, chunkCheckpoint, table.target());
            errors.add(writeFailureMessage(table, 0L, "ATOMIC_WRITE_FAILED:keymap/checkpoint", failure));
            return new WriteOutcome(0L, false);
        }
        commitAndAccept(connection, registry, chunkCheckpoint, state, checkpoints, table.target());
        return new WriteOutcome(written, true);
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
