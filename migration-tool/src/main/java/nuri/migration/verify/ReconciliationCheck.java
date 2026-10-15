package nuri.migration.verify;

/**
 * [ADR-0029 L4 D2] 매핑 단위 대사의 검사 이름. 증거·보고 문구는 이 이름만 싣는다.
 *
 * <ul>
 *   <li>{@link #SOURCE_ROWS} — 원천 행 수 = 조회 수. source freeze 전제의 신호다.</li>
 *   <li>{@link #NON_NULL} — 원천 NULL 아닌 수 − 격리 − nullify + NULL 대체 = 대상 NULL 아닌 수.</li>
 *   <li>{@link #SUM} — 정확 수치 합(원천 − 격리 = 대상).</li>
 *   <li>{@link #MIN_MAX} — 최소·최대. 격리가 없으면 같고, 있으면 대상이 원천 범위 안이다.</li>
 *   <li>{@link #CODE_DISTRIBUTION} — codemap 결과 분포 = 대상 분포.</li>
 *   <li>{@link #LOOKUP_NULL_FLOOR} — at_most_one 조회 컬럼의 대상 NULL 수 ≥ 짝 없음 수.</li>
 *   <li>{@link #DOMAIN} — 문자 형식 도메인(YMD8·YMDHMS14·HMS6·YN) 적합.</li>
 *   <li>{@link #SAMPLE} — 표본 키의 원값을 다시 변환한 값 = 대상 값.</li>
 * </ul>
 */
public enum ReconciliationCheck {
    SOURCE_ROWS,
    NON_NULL,
    SUM,
    MIN_MAX,
    CODE_DISTRIBUTION,
    LOOKUP_NULL_FLOOR,
    DOMAIN,
    SAMPLE
}
