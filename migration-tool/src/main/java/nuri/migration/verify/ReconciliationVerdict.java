package nuri.migration.verify;

/** [ADR-0029 L4 D2] 대사 판정 세 값. {@link #NOT_COVERED} 는 표 상태를 바꾸지 않는다. */
public enum ReconciliationVerdict {
    PASS,
    FAIL,
    NOT_COVERED
}
