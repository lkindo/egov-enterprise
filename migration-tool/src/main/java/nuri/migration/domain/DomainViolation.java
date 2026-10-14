package nuri.migration.domain;

/**
 * 표준 도메인 변환기가 값을 거부한 이유(ADR-0029 L3a-1). 어휘는 적합성 추정기({@code ConformanceEstimator})가 행 수로
 * 세는 위반과 같다 — {@link #BLANK}·{@link #PLACEHOLDER_DATE}·{@link #INVALID_DATE}·{@link #FORMAT} 은 추정기와 같은
 * 값을 같은 이유로 거부한다({@code DomainParityTest}).
 */
public enum DomainViolation {
    /** 공백뿐인 문자. */
    BLANK,
    /** 8자리·하이픈 형태의 자리표시 날짜({@link DomainPlaceholders}). 슬래시·점·일시 표기는 자리표시로 보지 않는다. */
    PLACEHOLDER_DATE,
    /** 모양은 날짜·일시인데 달력·시각에 없는 값. */
    INVALID_DATE,
    /** 날짜 의미 대상에 자정이 아닌 시각이 붙은 값. 버리려면 {@code *-truncate} 변환기로 밝힌다. */
    TIME_PRESENT,
    /** 그 변환기가 받는 모양이 아닌 값. */
    FORMAT,
    /** 추정기가 판정하지 못하는 값 종류(LOB·이진·시각 전용 등). 격리할 수 없다. */
    UNSUPPORTED_VALUE_TYPE
}
