package nuri.migration.verify;

import nuri.migration.domain.DomainCategory;

import java.util.List;

/**
 * [ADR-0029 L4 D2] 컬럼 하나의 대사 계획 — 어떤 검사를 켜고 어떤 검사를 어떤 이유로 판정하지 않는지. 값은 담지 않는다.
 *
 * <p>{@link ColumnClassifier} 가 만들고, 실행기 수집({@link ReconciliationRun})·원천 집계({@link SourceAggregateQuery})·
 * 대상 누적({@link TargetTally})·판정({@link ReconciliationJudge})이 같은 계획을 쓴다.
 *
 * @param targetColumn     대상 컬럼
 * @param sourceColumn     소문자 원천 컬럼. 상수·조회·소스 없음은 null 이다
 * @param sourceType       inventory 의 원천 컬럼 타입. 모르면 null 이다
 * @param aggregate        합·최소·최대 종류
 * @param nonNull          NULL 계정 검사를 하는가
 * @param code             codemap 결과 분포를 대사하는가
 * @param codemap          codemap 이름. 없으면 null 이다
 * @param nullFallbackable codemap 이 NULL 을 대체값으로 바꾸는가({@code nullAs: fallback})
 * @param domain           문자 형식 도메인 범주. 판정하지 않으면 null 이다
 * @param lookupAlias      at_most_one 조회 컬럼의 별칭. 아니면 null 이다
 * @param sampled          표본 재계산 비교에 넣는가
 * @param replay           표본 재계산 방법. 표본이 아니면 null 이다
 * @param gaps             판정하지 않는 검사와 그 이유
 */
public record ColumnCheck(
        String targetColumn,
        String sourceColumn,
        SourceColumnType sourceType,
        Aggregate aggregate,
        boolean nonNull,
        boolean code,
        String codemap,
        boolean nullFallbackable,
        DomainCategory domain,
        String lookupAlias,
        boolean sampled,
        ColumnReplay.Column replay,
        List<Gap> gaps) {

    public ColumnCheck {
        if (targetColumn == null || targetColumn.isBlank()) {
            throw new IllegalArgumentException("targetColumn must not be blank");
        }
        aggregate = aggregate == null ? Aggregate.NONE : aggregate;
        gaps = gaps == null ? List.of() : List.copyOf(gaps);
        if (sampled && replay == null) {
            throw new IllegalArgumentException("sampled column needs a replay");
        }
    }

    /** 합·최소·최대 종류. {@link #NUM} 은 정확 수치, {@link #TEMPORAL} 은 시간대 없는 날짜·일시다. */
    public enum Aggregate { NUM, TEMPORAL, NONE }

    /** 판정하지 않는 검사 하나. */
    public record Gap(ReconciliationCheck check, CoverageReason reason) {}

    /** inventory COLUMN 의 타입 메타(값 없음). {@code size}·{@code scale} 은 없으면 null 이다. */
    public record SourceColumnType(int jdbcType, String nativeType, Long size, Integer scale) {}
}
