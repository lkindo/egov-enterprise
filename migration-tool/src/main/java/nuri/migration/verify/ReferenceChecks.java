package nuri.migration.verify;

import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.verify.ConstraintProof.ForeignKeyProof;
import nuri.migration.verify.ConstraintProof.ProofResult;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.MappingTally;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] 고아 참조 대사의 과제와 판정.
 *
 * <p>증명한 물리 FK 는 질의 없이 PASS 다. 증명하지 못한 물리 FK 와, 같은 자식·부모·컬럼 짝의 증명된 물리 FK 가 없는 선언 참조
 * (fkRef·foreignKeys·{@code verify.references})는 대상 DB 안에서 한 문장으로 센다 — {@code NOT EXISTS} 로 부모를 찾고 값은
 * JVM 으로 오지 않는다. 자식 표 전체가 대상이다(INSERT-only 라 이전 run 의 행도 컷오버 상태다). FK 와 같이 컬럼 하나라도 NULL
 * 이면 세지 않는다. 물리 FK 를 증명하지 못했거나 증명했어도 기존 행을 검사하지 않았으면(NOT VALID) 그 사유를 판정의
 * {@code proofNote} 로 남긴다 — 고아가 0 이어도 증거에 보인다.</p>
 *
 * <p>후보: 이번 run 에서 격리한 행이 있는 보존 키(한 컬럼 PK) 매핑의 대상마다, 다른 매핑 대상 가운데 그 PK 와 이름이 같은
 * 컬럼이 있고 참조로 덮이지 않은 곳을 격리 키로 센다. 건수만 남기고 판정에 쓰지 않는다 — 이름이 같다는 것은 참조의 증거가
 * 아니다. 복합 PK 표는 후보를 세지 않고 그 사실({@link CoverageReason#COMPOSITE_KEY})을 남긴다.</p>
 */
public final class ReferenceChecks {

    /** 고아 참조 FAIL 사유. */
    public static final String ORPHAN_REFERENCE = "ORPHAN_REFERENCE";
    /** 후보 질의 한 번에 바인딩하는 키 수. */
    static final int CANDIDATE_BATCH = 500;

    private ReferenceChecks() {
    }

    /** 판정 방법. */
    public enum Method { PROVEN, SCANNED }

    /**
     * 대사 과제 하나. {@link Method#SCANNED} 면 {@link #orphanSql} 로 센다. {@code reason} 은 물리 FK 의 증명 메모(증명하지 못한
     * 이유, 또는 증명했어도 기존 행을 검사하지 않은 {@link ConstraintProof#NOT_VALIDATED})다.
     */
    public record ReferenceTask(DeclaredReference reference, Method method, String reason) {}

    /**
     * 참조 하나의 판정. {@code orphans} 는 고아 행 수, {@code reason} 은 FAIL 사유, {@code proofNote} 는 과제의 증명 메모다.
     */
    public record ReferenceVerdict(DeclaredReference reference, Method method, ReconciliationVerdict status,
                                   Long orphans, String reason, String proofNote) {}

    /** 후보 하나 — 부모 대상·PK, 자식 대상·컬럼, 격리 키(메모리만). */
    public record CandidateTask(String parent, String parentColumn, String child, String column, List<Object> keys) {

        public CandidateTask {
            keys = keys == null ? List.of() : Collections.unmodifiableList(new ArrayList<>(keys));
        }

        @Override
        public String toString() {
            return "CandidateTask[" + parent + " <- " + child + "." + column + "]";
        }
    }

    /** 후보 결과. 건수만 싣는다. {@code reason} 이 있으면 세지 못했다. */
    public record CandidateResult(String parent, String child, String column, Long rows, CoverageReason reason) {}

    /**
     * 대사 과제. 증명 결과의 물리 FK 와 선언 참조를 합친다 — 같은 참조는 하나로 둔다. 선언 참조가 증명된 물리 FK 와 같으면
     * PROVEN, 증명하지 못한 물리 FK 와 같으면 그 물리 FK 의 대조가 덮는다.
     */
    public static List<ReferenceTask> tasks(List<DeclaredReference> declared, ProofResult proof) {
        List<ReferenceTask> tasks = new ArrayList<>();
        List<DeclaredReference> covered = new ArrayList<>();
        for (ForeignKeyProof foreignKey : proof == null ? List.<ForeignKeyProof>of() : proof.foreignKeys()) {
            DeclaredReference reference = foreignKey.reference();
            if (covered.stream().anyMatch(reference::sameAs)) {
                continue;
            }
            covered.add(reference);
            tasks.add(new ReferenceTask(reference, foreignKey.proven() ? Method.PROVEN : Method.SCANNED,
                    foreignKey.reason()));
        }
        for (DeclaredReference reference : DeclaredReference.distinct(declared == null ? List.of() : declared)) {
            if (covered.stream().anyMatch(reference::sameAs)) {
                continue;
            }
            covered.add(reference);
            tasks.add(new ReferenceTask(reference, Method.SCANNED, null));
        }
        return tasks;
    }

    /** 고아 행 수를 세는 문장. 식별자만 쓰고 값을 바인딩하지 않는다. */
    public static String orphanSql(DeclaredReference reference) {
        StringBuilder sql = new StringBuilder("SELECT count(*) FROM ")
                .append(SourceIntrospector.qualifiedIdent(reference.child())).append(" c WHERE ");
        List<String> notNull = new ArrayList<>();
        List<String> join = new ArrayList<>();
        for (int i = 0; i < reference.childColumns().size(); i++) {
            String child = "c." + SourceIntrospector.ident(reference.childColumns().get(i));
            notNull.add(child + " IS NOT NULL");
            join.add("p." + SourceIntrospector.ident(reference.parentColumns().get(i)) + " = " + child);
        }
        sql.append(String.join(" AND ", notNull))
                .append(" AND NOT EXISTS (SELECT 1 FROM ")
                .append(SourceIntrospector.qualifiedIdent(reference.parent()))
                .append(" p WHERE ").append(String.join(" AND ", join)).append(')');
        return sql.toString();
    }

    /** 증명한 과제의 판정. */
    public static ReferenceVerdict proven(ReferenceTask task) {
        return new ReferenceVerdict(task.reference(), Method.PROVEN, ReconciliationVerdict.PASS, null, null,
                task.reason());
    }

    /** 센 고아 수로 판정한다. 0 이면 PASS, 아니면 FAIL {@link #ORPHAN_REFERENCE}(건수). */
    public static ReferenceVerdict judge(ReferenceTask task, long orphans) {
        return orphans == 0
                ? new ReferenceVerdict(task.reference(), Method.SCANNED, ReconciliationVerdict.PASS, 0L, null,
                task.reason())
                : new ReferenceVerdict(task.reference(), Method.SCANNED, ReconciliationVerdict.FAIL, orphans,
                ORPHAN_REFERENCE, task.reason());
    }

    /** 질의가 실패한 과제. SQLSTATE 만 싣는다. */
    public static ReferenceVerdict failed(ReferenceTask task, String sqlState) {
        return new ReferenceVerdict(task.reference(), Method.SCANNED, ReconciliationVerdict.FAIL, null,
                "REFERENCE_QUERY_FAILED(SQLSTATE=" + (sqlState == null ? "unknown" : sqlState) + ")", task.reason());
    }

    /** 후보 과제와, 키를 알 수 없어 세지 못하는 부모의 결과. */
    public record Candidates(List<CandidateTask> tasks, List<CandidateResult> unresolved) {

        public Candidates {
            tasks = List.copyOf(tasks);
            unresolved = List.copyOf(unresolved);
        }
    }

    /**
     * 격리 키 후보. {@code tallies} 는 라벨(소문자) → 실행기 수집, {@code references} 는 과제의 참조(물리·선언)다. 키를 알 수
     * 없으면 그 부모에 {@link CoverageReason#ISOLATED_KEY_UNKNOWN}, PK 가 두 컬럼 이상이면 {@link CoverageReason#COMPOSITE_KEY}
     * 결과를 둔다.
     */
    public static Candidates candidates(ReconciliationPlan plan, Map<String, MappingTally> tallies,
                                        List<DeclaredReference> references) {
        Objects.requireNonNull(references, "references");
        List<CandidateTask> candidates = new ArrayList<>();
        List<CandidateResult> unknown = new ArrayList<>();
        for (MappingPlan mapping : plan.mappings()) {
            MappingTally tally = tallies.get(mapping.label().toLowerCase(Locale.ROOT));
            if (tally == null || tally.isolatedRows() == 0 || !mapping.preservedKey()
                    || mapping.targetPrimaryKey().isEmpty()) {
                continue;
            }
            if (mapping.targetPrimaryKey().size() > 1) {
                // 복합 키는 이름이 같은 컬럼 하나로 자식을 찾을 수 없다 — 세지 않았다는 사실을 남긴다.
                unknown.add(new CandidateResult(mapping.target(), null, null, null, CoverageReason.COMPOSITE_KEY));
                continue;
            }
            if (tally.keyUnknown()) {
                unknown.add(new CandidateResult(mapping.target(), null, null, null,
                        CoverageReason.ISOLATED_KEY_UNKNOWN));
                continue;
            }
            String key = mapping.targetPrimaryKey().getFirst();
            Set<Object> keys = new LinkedHashSet<>();
            tally.isolatedKeys().forEach(tuple -> keys.add(tuple.getFirst()));
            for (TableMetadata table : plan.mappedTables()) {
                String child = (table.schema() + "." + table.name()).toLowerCase(Locale.ROOT);
                if (child.equalsIgnoreCase(mapping.target())) {
                    continue;
                }
                for (ColumnMetadata column : table.columns()) {
                    if (!column.name().equalsIgnoreCase(key)) {
                        continue;
                    }
                    DeclaredReference probe = new DeclaredReference(child, List.of(column.name()), mapping.target(),
                            List.of(key), DeclaredReference.Origin.DECLARED);
                    if (references.stream().noneMatch(probe::sameAs)) {
                        candidates.add(new CandidateTask(mapping.target(), key, child, column.name(),
                                new ArrayList<>(keys)));
                    }
                }
            }
        }
        return new Candidates(candidates, unknown);
    }

    /** 후보 문장 — 격리 키를 가리키고 부모가 없는 자식 행 수. 키는 바인딩만 한다. */
    public static String candidateSql(CandidateTask task, int keys) {
        if (keys <= 0 || keys > CANDIDATE_BATCH) {
            throw new IllegalArgumentException("candidate batch size out of range");
        }
        String child = "c." + SourceIntrospector.ident(task.column());
        return "SELECT count(*) FROM " + SourceIntrospector.qualifiedIdent(task.child()) + " c WHERE " + child
                + " IN (" + String.join(", ", Collections.nCopies(keys, "?")) + ") AND NOT EXISTS (SELECT 1 FROM "
                + SourceIntrospector.qualifiedIdent(task.parent()) + " p WHERE p."
                + SourceIntrospector.ident(task.parentColumn()) + " = " + child + ")";
    }

    /** 후보 키를 {@link #CANDIDATE_BATCH} 개씩 나눈다. */
    public static List<List<Object>> candidateBatches(CandidateTask task) {
        List<List<Object>> batches = new ArrayList<>();
        for (int from = 0; from < task.keys().size(); from += CANDIDATE_BATCH) {
            batches.add(task.keys().subList(from, Math.min(from + CANDIDATE_BATCH, task.keys().size())));
        }
        return batches;
    }

    /** 후보 결과(건수만). */
    public static CandidateResult candidateResult(CandidateTask task, long rows) {
        return new CandidateResult(task.parent(), task.child(), task.column(), rows, null);
    }

    /** 후보 질의 실패. FAIL 이 아니라 세지 못했다는 기록이다. */
    public static CandidateResult candidateFailed(CandidateTask task) {
        return new CandidateResult(task.parent(), task.child(), task.column(), null,
                CoverageReason.CANDIDATE_QUERY_FAILED);
    }
}
