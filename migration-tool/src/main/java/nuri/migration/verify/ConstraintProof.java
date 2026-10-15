package nuri.migration.verify;

import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetConstraintSnapshot.Constraint;
import nuri.migration.postgres.TargetConstraintSnapshot.TableConstraints;
import nuri.migration.postgres.TargetConstraintSnapshot.UniqueIndex;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] 적재 중 물리 FK·유일 인덱스가 집행됐는지 카탈로그로 증명한다.
 *
 * <p>FK(자식이 매핑 대상)는 적재 시작(load 가 읽은 승인 fingerprint)과 끝(verify 시점) 모두에 같은 정의로 있고, 자식 쪽 RI
 * 트리거가 모두 {@code tgenabled IN ('O','A')} 이며, 제약·트리거 행 버전({@code xmin})이 시작과 끝에서 같고, 쓰기 세션이 모두
 * {@code session_replication_role = origin} 이었고, 이번 실행 전에 같은 run 이 쓴 행(재개로 건너뛴 행)이 그 자식 표에 없을
 * 때만 증명된다. {@code 'R'}(replica 전용) 트리거는 origin 세션에서 발화하지 않으므로 증명이 아니다. 행 버전은 적재 중 트리거를
 * 껐다 다시 켠 경우를 잡는다 — 상태는 같아도 행이 다시 쓰인다. 증명하지 못한 FK 는 대상 DB 안 고아 대조로 내려간다
 * ({@link ReferenceChecks}).</p>
 *
 * <p>증명은 이번 실행의 쓰기만 덮는다. {@code NOT VALID} 로 더한 FK 도 RI 트리거가 새 행을 검사하므로 증명할 수 있지만, 그 전부터
 * 있던 행은 검사되지 않았다 — 증명한 FK 에 {@link #NOT_VALIDATED} 를 메모로 남긴다(실패가 아니다).</p>
 *
 * <p>유일 인덱스는 시작·끝 모두 {@code indisvalid && indisready} 면 PASS, 아니면 FAIL {@code CONSTRAINT_NOT_ENFORCED} 다. 끝에서
 * 유효한 유일 인덱스는 그때의 모든 행이 유일하다는 증명이다. 시작 스냅숏이 없으면 판정하지 않고
 * ({@link CoverageReason#CONSTRAINTS_UNREAD}), 시작은 있는데 끝을 읽지 못했으면 FAIL {@code CONSTRAINTS_UNREAD}(SQLSTATE)다.</p>
 */
public final class ConstraintProof {

    /** 유일 인덱스 FAIL 사유. */
    public static final String CONSTRAINT_NOT_ENFORCED = "CONSTRAINT_NOT_ENFORCED";
    /** 증명한 FK 의 메모 — 이번 실행 전부터 있던 행은 검사되지 않았다. */
    public static final String NOT_VALIDATED = "NOT_VALIDATED";
    /** 이번 실행 전에 같은 run 이 쓴 행이 그 자식 표에 있다(재개). */
    public static final String PRIOR_EXECUTION_ROWS = "PRIOR_EXECUTION_ROWS";
    /** 제약·트리거 행 버전이 시작과 끝에서 다르다(적재 중 트리거를 껐다 켰다 등). */
    public static final String CATALOG_ROW_CHANGED = "CATALOG_ROW_CHANGED";

    private static final Set<String> ENFORCING_TRIGGER_STATES = Set.of("O", "A");

    private ConstraintProof() {
    }

    /**
     * FK 하나의 증명. {@code reason} 은 증명하지 못한 이유(고정 어휘)이고, 증명했으면 null 이거나 {@link #NOT_VALIDATED}
     * 메모다.
     */
    public record ForeignKeyProof(DeclaredReference reference, String constraint, boolean proven, String reason) {}

    /** 유일 인덱스 하나의 판정. */
    public record UniqueProof(String table, String index, ReconciliationVerdict status, String reason) {}

    /** {@code read} 는 시작·끝 스냅숏을 모두 읽었는가다 — 아니면 FK 는 증명하지 못하고 유일 인덱스는 판정하지 못한다. */
    public record ProofResult(boolean read, List<ForeignKeyProof> foreignKeys, List<UniqueProof> uniqueIndexes) {

        public ProofResult {
            foreignKeys = List.copyOf(foreignKeys);
            uniqueIndexes = List.copyOf(uniqueIndexes);
        }
    }

    /** 끝을 읽지 못한 사유 없이, 재개 행 없이 증명한다. */
    public static ProofResult prove(TargetConstraintSnapshot start, TargetConstraintSnapshot end,
                                    Boolean replicationRoleOrigin, Set<String> mappedTargets) {
        return prove(start, end, null, replicationRoleOrigin, mappedTargets, Set.of());
    }

    /**
     * @param start                 적재 시작의 제약(load 가 읽은 승인 fingerprint). 읽지 못했으면 null
     * @param end                   verify 시점의 제약. 읽지 못했으면 null
     * @param endUnread             끝을 읽지 못한 사유(고정 어휘·SQLSTATE). 없으면 {@code CONSTRAINTS_UNREAD}
     * @param replicationRoleOrigin 쓰기 세션이 모두 origin 이었는가. 검사하지 않았으면 null
     * @param mappedTargets         매핑 대상 표({@code schema.table}, 대소문자 무시). null 이면 스냅숏의 모든 표
     * @param priorRowTargets       이번 실행 전에 같은 run 이 쓴 행이 있는 매핑 대상({@code schema.table}, 대소문자 무시)
     */
    public static ProofResult prove(TargetConstraintSnapshot start, TargetConstraintSnapshot end, String endUnread,
                                    Boolean replicationRoleOrigin, Set<String> mappedTargets,
                                    Set<String> priorRowTargets) {
        Set<String> prior = priorRowTargets == null ? Set.of() : priorRowTargets;
        List<ForeignKeyProof> foreignKeys = new ArrayList<>();
        List<UniqueProof> uniqueIndexes = new ArrayList<>();
        Map<String, Constraint> startKeys = foreignKeys(start, mappedTargets);
        Map<String, Constraint> endKeys = foreignKeys(end, mappedTargets);
        Map<String, Constraint> all = new LinkedHashMap<>(startKeys);
        endKeys.forEach(all::putIfAbsent);
        for (Map.Entry<String, Constraint> entry : all.entrySet()) {
            String table = tableOf(entry.getKey());
            Constraint constraint = entry.getValue();
            DeclaredReference reference = new DeclaredReference(table, constraint.columns(),
                    (constraint.refSchema() + "." + constraint.refTable()).toLowerCase(Locale.ROOT),
                    constraint.refColumns(), DeclaredReference.Origin.PHYSICAL);
            Constraint before = startKeys.get(entry.getKey());
            Constraint after = endKeys.get(entry.getKey());
            String reason = unproven(start, end, before, after, replicationRoleOrigin,
                    prior.stream().anyMatch(table::equalsIgnoreCase));
            if (reason != null) {
                foreignKeys.add(new ForeignKeyProof(reference, constraint.name(), false, reason));
            } else {
                boolean validated = before.validated() && after.validated();
                foreignKeys.add(new ForeignKeyProof(reference, constraint.name(), true,
                        validated ? null : NOT_VALIDATED));
            }
        }
        if (start == null) {
            for (Map.Entry<String, UniqueIndex> entry : uniqueIndexes(end, mappedTargets).entrySet()) {
                uniqueIndexes.add(new UniqueProof(tableOf(entry.getKey()), entry.getValue().name(),
                        ReconciliationVerdict.NOT_COVERED, CoverageReason.CONSTRAINTS_UNREAD.name()));
            }
            return new ProofResult(false, foreignKeys, uniqueIndexes);
        }
        if (end == null) {
            // 시작에 있던 유일 인덱스를 끝에서 확인하지 못했다 — 증명할 수 없으므로 실패다.
            String unread = endUnread == null ? CoverageReason.CONSTRAINTS_UNREAD.name() : endUnread;
            for (Map.Entry<String, UniqueIndex> entry : uniqueIndexes(start, mappedTargets).entrySet()) {
                uniqueIndexes.add(new UniqueProof(tableOf(entry.getKey()), entry.getValue().name(),
                        ReconciliationVerdict.FAIL, unread));
            }
            return new ProofResult(false, foreignKeys, uniqueIndexes);
        }
        Map<String, UniqueIndex> startIndexes = uniqueIndexes(start, mappedTargets);
        Map<String, UniqueIndex> endIndexes = uniqueIndexes(end, mappedTargets);
        Map<String, UniqueIndex> allIndexes = new LinkedHashMap<>(startIndexes);
        endIndexes.forEach(allIndexes::putIfAbsent);
        for (Map.Entry<String, UniqueIndex> entry : allIndexes.entrySet()) {
            UniqueIndex before = startIndexes.get(entry.getKey());
            UniqueIndex after = endIndexes.get(entry.getKey());
            boolean enforced = before != null && after != null && enforcing(before) && enforcing(after)
                    && before.columns().equals(after.columns());
            uniqueIndexes.add(new UniqueProof(tableOf(entry.getKey()), entry.getValue().name(),
                    enforced ? ReconciliationVerdict.PASS : ReconciliationVerdict.FAIL,
                    enforced ? null : CONSTRAINT_NOT_ENFORCED));
        }
        return new ProofResult(true, foreignKeys, uniqueIndexes);
    }

    /** 증명하지 못한 이유. 증명했으면 null. */
    private static String unproven(TargetConstraintSnapshot start, TargetConstraintSnapshot end,
                                   Constraint before, Constraint after, Boolean replicationRoleOrigin,
                                   boolean priorRows) {
        if (start == null || end == null) {
            return CoverageReason.CONSTRAINTS_UNREAD.name();
        }
        if (before == null || after == null || !sameDefinition(before, after)) {
            return "CONSTRAINT_CHANGED";
        }
        if (!enforcing(before) || !enforcing(after)) {
            return "TRIGGER_NOT_ENABLED";
        }
        if (!before.catalogVersions().equals(after.catalogVersions())) {
            return CATALOG_ROW_CHANGED;
        }
        if (!Boolean.TRUE.equals(replicationRoleOrigin)) {
            return "REPLICATION_ROLE_UNPROVEN";
        }
        if (priorRows) {
            return PRIOR_EXECUTION_ROWS;
        }
        return null;
    }

    private static boolean enforcing(Constraint constraint) {
        return !constraint.triggerStates().isEmpty()
                && ENFORCING_TRIGGER_STATES.containsAll(constraint.triggerStates());
    }

    private static boolean enforcing(UniqueIndex index) {
        return index.valid() && index.ready();
    }

    private static boolean sameDefinition(Constraint before, Constraint after) {
        return before.columns().equals(after.columns()) && before.refColumns().equals(after.refColumns())
                && Objects.equals(before.refSchema(), after.refSchema())
                && Objects.equals(before.refTable(), after.refTable());
    }

    /** 표 + 이름 → FK. 매핑 대상이 아닌 표는 뺀다. */
    private static Map<String, Constraint> foreignKeys(TargetConstraintSnapshot snapshot, Set<String> mapped) {
        Map<String, Constraint> keys = new LinkedHashMap<>();
        if (snapshot == null) {
            return keys;
        }
        for (TableConstraints table : snapshot.tables()) {
            if (!included(table, mapped)) {
                continue;
            }
            for (Constraint constraint : table.constraints()) {
                if (constraint.foreignKey()) {
                    keys.put(table.qualifiedName() + '\u0000' + constraint.name(), constraint);
                }
            }
        }
        return keys;
    }

    private static Map<String, UniqueIndex> uniqueIndexes(TargetConstraintSnapshot snapshot, Set<String> mapped) {
        Map<String, UniqueIndex> indexes = new LinkedHashMap<>();
        if (snapshot == null) {
            return indexes;
        }
        for (TableConstraints table : snapshot.tables()) {
            if (!included(table, mapped)) {
                continue;
            }
            for (UniqueIndex index : table.uniqueIndexes()) {
                indexes.put(table.qualifiedName() + '\u0000' + index.name(), index);
            }
        }
        return indexes;
    }

    private static boolean included(TableConstraints table, Set<String> mapped) {
        return mapped == null || mapped.stream().anyMatch(name -> name.equalsIgnoreCase(table.qualifiedName()));
    }

    private static String tableOf(String key) {
        return key.substring(0, key.indexOf('\u0000'));
    }
}
