package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * 결재 참조자의 기본 키 — 문서·지정 차수·사람(esntlId). 지정은 차수 단위다: 한 사람은 한 차수에 한 번만 지정되고(같은 차수의
 * 재지정은 무시한다), 다른 차수에 다시 지정되면 새 행이 생긴다(2026-10-04 D4 개정 1).
 */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionReferenceId implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "ifml_atrz_sn", nullable = false)
    private Long ifmlAtrzSn;
    @Column(name = "atrz_cycl", precision = 7, scale = 0, nullable = false)
    private BigDecimal atrzCycl;
    @Column(name = "user_id", length = 20, nullable = false)
    private String userId;

    public InformalSanctionReferenceId(Long ifmlAtrzSn, BigDecimal atrzCycl, String userId) {
        this.ifmlAtrzSn = Objects.requireNonNull(ifmlAtrzSn);
        this.atrzCycl = Objects.requireNonNull(atrzCycl).setScale(0, RoundingMode.UNNECESSARY);
        this.userId = Objects.requireNonNull(userId);
    }
}
