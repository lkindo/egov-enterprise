package nuri.migration.verify;

import com.fasterxml.jackson.annotation.JsonInclude;
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

    /** 참조 하나의 판정 기록. {@code method} 는 {@code PROVEN}·{@code SCANNED} 다. */
    public record ReferenceRecord(String child, List<String> columns, String parent, String origin, String method,
                                  String status, @JsonInclude(JsonInclude.Include.NON_NULL) Long orphans,
                                  @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {

        public static ReferenceRecord of(ReferenceVerdict verdict) {
            DeclaredReference reference = verdict.reference();
            return new ReferenceRecord(reference.child(), reference.childColumns(), reference.parent(),
                    reference.origin().name(), verdict.method().name(), verdict.status().name(), verdict.orphans(),
                    verdict.reason());
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

    /** [ADR-0029 L4 D7] 공통코드·허용값 대사 한 컬럼의 기록. 필드는 D7 판정이 정한다. */
    public record CodeSetRecord() {}

    /** [ADR-0029 L4 D7] codemap 결과 종류와 맞지 않은 키 위치의 기록. 필드는 D7 판정이 정한다. */
    public record CodemapUseRecord() {}
}
