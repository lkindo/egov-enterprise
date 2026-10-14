package nuri.migration.domain;

import java.util.Objects;

/**
 * 표준 도메인 변환기의 거부. 메시지는 {@code domain value rejected: <CODE>} 로 고정하고 원인 예외를 붙이지 않는다 —
 * 값·파서 원문이 오류·보고서·산출물로 새지 않게 하기 위해서다.
 */
public final class DomainValueRejected extends IllegalArgumentException {

    private final DomainViolation violation;

    public DomainValueRejected(DomainViolation violation) {
        super("domain value rejected: " + Objects.requireNonNull(violation, "violation").name());
        this.violation = violation;
    }

    public DomainViolation violation() {
        return violation;
    }
}
