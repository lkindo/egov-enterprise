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
 * <p>FK(자식이 매핑 대상)는 적재 시작(승인 fingerprint)과 끝(verify 시점) 모두에 같은 정의로 있고, 검증된(validated) 제약이며,
 * 자식 쪽 RI 트리거가 모두 {@code tgenabled IN ('O','A')} 이고, 쓰기 세션이 모두 {@code session_replication_role = origin}
 * 이었을 때만 증명된다. {@code 'R'}(replica 전용) 트리거는 origin 세션에서 발화하지 않으므로 증명이 아니다. 증명하지 못한 FK 는
 * 대상 DB 안 고아 대조로 내려간다({@link ReferenceChecks}).</p>
 *
 * <p>유일 인덱스는 시작·끝 모두 {@code indisvalid && indisready} 면 PASS, 아니면 FAIL {@code CONSTRAINT_NOT_ENFORCED} 다.
 * 스냅숏을 읽지 못했으면 판정하지 않는다({@link CoverageReason#CONSTRAINTS_UNREAD}).</p>
 */
public final class ConstraintProof {

    /** 유일 인덱스 FAIL 사유. */
    public static final String CONSTRAINT_NOT_ENFORCED = "CONSTRAINT_NOT_ENFORCED";

    private static final Set<String> ENFORCING_TRIGGER_STATES = Set.of("O", "A");

    private ConstraintProof() {
    }

    /** FK 하나의 증명. {@code reason} 은 증명하지 못한 이유(고정 어휘)다. */
    public record ForeignKeyProof(DeclaredReference reference, String constraint, boolean proven, String reason) {}

    /** 유일 인덱스 하나의 판정. */
    public record UniqueProof(String table, String index, ReconciliationVerdict status, String reason) {}

    /** {@code read} 는 시작·끝 스냅숏을 모두 읽었는가다 — 아니면 FK 는 증명하지 못하고 유일 인덱스는 판정하지 않는다. */
    public record ProofResult(boolean read, List<ForeignKeyProof> foreignKeys, List<UniqueProof> uniqueIndexes) {

        public ProofResult {
            foreignKeys = List.copyOf(foreignKeys);
            uniqueIndexes = List.copyOf(uniqueIndexes);
        }
    }

    /**
     * @param start                 적재 시작의 제약(승인 fingerprint). 읽지 못했으면 null
     * @param end                   verify 시점의 제약. 읽지 못했으면 null
     * @param replicationRoleOrigin 쓰기 세션이 모두 origin 이었는가. 검사하지 않았으면 null
     * @param mappedTargets         매핑 대상 표({@code schema.table}, 대소문자 무시). null 이면 스냅숏의 모든 표
     */
    public static ProofResult prove(TargetConstraintSnapshot start, TargetConstraintSnapshot end,
                                    Boolean replicationRoleOrigin, Set<String> mappedTargets) {
        List<ForeignKeyProof> foreignKeys = new ArrayList<>();
        List<UniqueProof> uniqueIndexes = new ArrayList<>();
        Map<String, Constraint> startKeys = foreignKeys(start, mappedTargets);
        Map<String, Constraint> endKeys = foreignKeys(end, mappedTargets);
        Map<String, Constraint> all = new LinkedHashMap<>(startKeys);
        endKeys.forEach(all::putIfAbsent);
        for (Map.Entry<String, Constraint> entry : all.entrySet()) {
            String table = entry.getKey().substring(0, entry.getKey().indexOf('\u0000'));
            Constraint constraint = entry.getValue();
            DeclaredReference reference = new DeclaredReference(table, constraint.columns(),
                    (constraint.refSchema() + "." + constraint.refTable()).toLowerCase(Locale.ROOT),
                    constraint.refColumns(), DeclaredReference.Origin.PHYSICAL);
            String reason = unproven(start, end, startKeys.get(entry.getKey()), endKeys.get(entry.getKey()),
                    replicationRoleOrigin);
            foreignKeys.add(new ForeignKeyProof(reference, constraint.name(), reason == null, reason));
        }
        if (start == null || end == null) {
            for (Map.Entry<String, UniqueIndex> entry : uniqueIndexes(start == null ? end : start,
                    mappedTargets).entrySet()) {
                uniqueIndexes.add(new UniqueProof(tableOf(entry.getKey()), entry.getValue().name(),
                        ReconciliationVerdict.NOT_COVERED, CoverageReason.CONSTRAINTS_UNREAD.name()));
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
            boolean enforced = before != null && after != null && before.valid() && before.ready()
                    && after.valid() && after.ready() && before.columns().equals(after.columns());
            uniqueIndexes.add(new UniqueProof(tableOf(entry.getKey()), entry.getValue().name(),
                    enforced ? ReconciliationVerdict.PASS : ReconciliationVerdict.FAIL,
                    enforced ? null : CONSTRAINT_NOT_ENFORCED));
        }
        return new ProofResult(true, foreignKeys, uniqueIndexes);
    }

    /** 증명하지 못한 이유. 증명했으면 null. */
    private static String unproven(TargetConstraintSnapshot start, TargetConstraintSnapshot end,
                                   Constraint before, Constraint after, Boolean replicationRoleOrigin) {
        if (start == null || end == null) {
            return CoverageReason.CONSTRAINTS_UNREAD.name();
        }
        if (before == null || after == null || !sameDefinition(before, after)) {
            return "CONSTRAINT_CHANGED";
        }
        if (!before.validated() || !after.validated()) {
            return "NOT_VALIDATED";
        }
        if (!enforcing(before) || !enforcing(after)) {
            return "TRIGGER_NOT_ENABLED";
        }
        if (!Boolean.TRUE.equals(replicationRoleOrigin)) {
            return "REPLICATION_ROLE_UNPROVEN";
        }
        return null;
    }

    private static boolean enforcing(Constraint constraint) {
        return !constraint.triggerStates().isEmpty()
                && ENFORCING_TRIGGER_STATES.containsAll(constraint.triggerStates());
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
