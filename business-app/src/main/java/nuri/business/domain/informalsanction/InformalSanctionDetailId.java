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

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionDetailId implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "ifml_atrz_sn", nullable = false)
    private Long ifmlAtrzSn;
    @Column(name = "atrz_cycl", precision = 7, scale = 0, nullable = false)
    private BigDecimal atrzCycl;
    @Column(name = "atrz_seq", precision = 10, scale = 0, nullable = false)
    private BigDecimal atrzSeq;
    @Column(name = "user_id", length = 20, nullable = false)
    private String userId;

    public InformalSanctionDetailId(Long ifmlAtrzSn, BigDecimal atrzCycl,
                                   BigDecimal atrzSeq, String userId) {
        this.ifmlAtrzSn = Objects.requireNonNull(ifmlAtrzSn);
        this.atrzCycl = Objects.requireNonNull(atrzCycl).setScale(0, RoundingMode.UNNECESSARY);
        this.atrzSeq = Objects.requireNonNull(atrzSeq).setScale(0, RoundingMode.UNNECESSARY);
        this.userId = Objects.requireNonNull(userId);
    }
}
