package nuri.migration.validate;

/**
 * [ADR-0029 L4 D7] 공통코드·허용값 대사 대상 한 컬럼. D2 의 대사 계획({@code ReconciliationPlan})이 목록으로 들고 다니며,
 * 필드(대상·원천 종류·그룹·허용값·원장 행)는 D7 판정이 채운다.
 */
public record CodeSetTarget() {
}
