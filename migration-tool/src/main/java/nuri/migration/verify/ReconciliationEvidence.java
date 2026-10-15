package nuri.migration.verify;

import com.fasterxml.jackson.annotation.JsonInclude;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.verify.CodeSetReconciler.CodeSetVerdict;
import nuri.migration.verify.ConstraintProof.UniqueProof;
import nuri.migration.verify.ReconciliationJudge.CheckResult;
import nuri.migration.verify.ReconciliationJudge.MappingReconciliation;
import nuri.migration.verify.ReconciliationJudge.Uncovered;
import nuri.migration.verify.ReferenceChecks.CandidateResult;
import nuri.migration.verify.ReferenceChecks.ReferenceVerdict;

import java.util.List;

/**
 * [ADR-0029 L4 D2·D7] 실행 증거에 싣는 대사 결과. 검사 이름·결과·건수·대상 표/컬럼 이름·원장 행 id·사유 코드만 싣고, 행 값·
 * 코드값·합·최소·최대·키·digest 는 싣지 않는다 — 판정에 쓴 값은 직렬화하지 않는 홀더({@link ReconciliationRun}·
 * {@link SourceAggregates}·{@link TargetTally})에만 있다.
 *
 * @param replicationRole 쓰기 세션의 {@code session_replication_role}: {@code ORIGIN}·{@code NOT_ORIGIN}·{@code NOT_CHECKED}
 */
public record ReconciliationEvidence(
        String replicationRole,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<MappingRecord> mappings,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ReferenceRecord> references,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<UniqueRecord> uniqueIndexes,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<CandidateRecord> orphanCandidates,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<CodeSetRecord> codeSets,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<CodemapUseRecord> codemapUse) {

    public ReconciliationEvidence {
        mappings = mappings == null ? List.of() : List.copyOf(mappings);
        references = references == null ? List.of() : List.copyOf(references);
        uniqueIndexes = uniqueIndexes == null ? List.of() : List.copyOf(uniqueIndexes);
        orphanCandidates = orphanCandidates == null ? List.of() : List.copyOf(orphanCandidates);
        codeSets = codeSets == null ? List.of() : List.copyOf(codeSets);
        codemapUse = codemapUse == null ? List.of() : List.copyOf(codemapUse);
    }

    /** 복제 역할 표기. COMMIT 이고 대사가 활성일 때만 검사한다. */
    public static String replicationRole(Boolean origin) {
        return origin == null ? "NOT_CHECKED" : origin ? "ORIGIN" : "NOT_ORIGIN";
    }

    /** 매핑 하나의 판정 기록. {@code mapping} 은 매핑 id(기본 매핑은 null)다. */
    public record MappingRecord(String source, @JsonInclude(JsonInclude.Include.NON_NULL) String mapping,
                                String target, String status, List<CheckRecord> checks,
                                @JsonInclude(JsonInclude.Include.NON_EMPTY) List<GapRecord> notCovered) {

        public static MappingRecord of(String source, String mapping, String target, MappingReconciliation result) {
            return new MappingRecord(source, mapping == null || mapping.isEmpty() ? null : mapping, target,
                    result.status().name(),
                    result.checks().stream().map(CheckRecord::of).toList(),
                    result.notCovered().stream().map(GapRecord::of).toList());
        }
    }

    public record CheckRecord(String check, @JsonInclude(JsonInclude.Include.NON_NULL) String column, String status,
                              @JsonInclude(JsonInclude.Include.NON_NULL) String reason,
                              @JsonInclude(JsonInclude.Include.NON_NULL) Long rows,
                              @JsonInclude(JsonInclude.Include.NON_NULL) Integer columns,
                              @JsonInclude(JsonInclude.Include.NON_NULL) Long mismatches) {

        static CheckRecord of(CheckResult result) {
            return new CheckRecord(result.check().name(), result.column(), result.status().name(), result.reason(),
                    result.rows(), result.columns(), result.mismatches());
        }
    }

    public record GapRecord(String column, String check, String reason) {

        static GapRecord of(Uncovered uncovered) {
            return new GapRecord(uncovered.column(), uncovered.check().name(), uncovered.reason().name());
        }
    }

    /**
     * 참조 하나의 판정 기록. {@code method} 는 {@code PROVEN}·{@code SCANNED} 다. {@code proofNote} 는 물리 FK 의 증명 메모 —
     * {@code SCANNED} 면 증명하지 못한 이유(예: {@code TRIGGER_NOT_ENABLED}), {@code PROVEN} 이면 기존 행을 검사하지 않은
     * {@code NOT_VALIDATED} 다. 고아가 0 이어도 남는다.
     */
    public record ReferenceRecord(String child, List<String> columns, String parent, String origin, String method,
                                  String status, @JsonInclude(JsonInclude.Include.NON_NULL) Long orphans,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) String reason,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) String proofNote) {

        public static ReferenceRecord of(ReferenceVerdict verdict) {
            DeclaredReference reference = verdict.reference();
            return new ReferenceRecord(reference.child(), reference.childColumns(), reference.parent(),
                    reference.origin().name(), verdict.method().name(), verdict.status().name(), verdict.orphans(),
                    verdict.reason(), verdict.proofNote());
        }
    }

    public record UniqueRecord(String table, String index, String status,
                               @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {

        public static UniqueRecord of(UniqueProof proof) {
            return new UniqueRecord(proof.table(), proof.index(), proof.status().name(), proof.reason());
        }
    }

    public record CandidateRecord(String parent, @JsonInclude(JsonInclude.Include.NON_NULL) String child,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) String column,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) Long rows,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {

        public static CandidateRecord of(CandidateResult result) {
            return new CandidateRecord(result.parent(), result.child(), result.column(), result.rows(),
                    result.reason() == null ? null : result.reason().name());
        }
    }

    /**
     * [ADR-0029 L4 D7] 공통코드·허용값 대사 한 컬럼의 기록. {@code group} 은 그룹 id(카탈로그 메타)이고 상세코드·허용값 값은
     * 싣지 않는다. {@code source} 는 {@code COMMON_CODE}·{@code ALLOWED_VALUES}·{@code UNRECONCILED}, {@code status} 는
     * {@code PASS}·{@code FAIL}·{@code RECORDED}·{@code UNRECONCILED} 다. 건수는 센 것만 싣는다.
     */
    public record CodeSetRecord(String target, String column, String source,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String group,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String use,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String ledgerEntry,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long nonNullRows,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long missingRows,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long missingDistinct,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long inactiveRows,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long outsideRows,
                                @JsonInclude(JsonInclude.Include.NON_NULL) Long distinct,
                                boolean groupAbsent, boolean deferred, String status,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {

        public static CodeSetRecord of(CodeSetVerdict verdict) {
            CodeSetTarget target = verdict.target();
            return new CodeSetRecord(target.table(), target.column(), target.source().name(), target.group(),
                    target.use() == null ? null : target.use().name(), target.ledgerEntry(), verdict.nonNull(),
                    verdict.missing(), verdict.missingDistinct(), verdict.inactive(), verdict.outside(),
                    verdict.distinct(), target.groupAbsent(), target.deferred(), verdict.status().name(),
                    verdict.reason());
        }
    }

    /**
     * [ADR-0029 L4 D7] (대상, 컬럼, codemap)마다 codemap 결과 종류 행 수와 한 번도 맞지 않은 {@code values} 키의 위치(1부터).
     * 키·코드값은 싣지 않는다.
     */
    public record CodemapUseRecord(String target, String column, String codemap, long mapped, long passthrough,
                                   long fallback, long nullFallback, List<Integer> unusedKeyPositions) {

        public CodemapUseRecord {
            unusedKeyPositions = unusedKeyPositions == null ? List.of() : List.copyOf(unusedKeyPositions);
        }
    }
}
