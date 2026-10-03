package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 결재 처리 이력 한 건(V2_121). 추가만 하고 고치지 않는다 — 결재자 교체·보완 요청·보완 답변·재알림을 남긴다.
 *
 * <p>행위자는 {@code frstRgtrId}(esntlId)이다. 보완 요청이 열려 있는지는 같은 차수의 마지막 ASK 뒤에 ANSWER 가
 * 없고 그 요청자가 아직 차례인지로 판정한다(서비스가 계산한다).
 */
@Entity
@Immutable
@Table(name = "tb_ifml_atrz_prcs_hstry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionProcess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ifml_atrz_prcs_hstry_sn", nullable = false, updatable = false)
    private Long ifmlAtrzPrcsHstrySn;

    @Column(name = "ifml_atrz_sn", nullable = false, updatable = false)
    private Long ifmlAtrzSn;

    @Column(name = "atrz_cycl", nullable = false, precision = 7, scale = 0, updatable = false)
    private BigDecimal atrzCycl;

    @Enumerated(EnumType.STRING)
    @Column(name = "prcs_type_cd", nullable = false, length = 12, updatable = false)
    private ApprovalProcessType prcsTypeCd;

    @Column(name = "trgt_user_id", length = 20, updatable = false)
    private String trgtUserId;

    @Column(name = "bfr_user_id", length = 20, updatable = false)
    private String bfrUserId;

    @Column(name = "prcs_cn", length = 4000, updatable = false)
    private String prcsCn;

    @Column(name = "frst_rgtr_id", nullable = false, length = 20, updatable = false)
    private String frstRgtrId;

    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    public static InformalSanctionProcess record(InformalSanction sanction, ApprovalProcessType type, String actorId,
            String targetUserId, String beforeUserId, String content, LocalDateTime at) {
        InformalSanctionProcess process = new InformalSanctionProcess();
        process.ifmlAtrzSn = Objects.requireNonNull(sanction.getIfmlAtrzSn());
        process.atrzCycl = Objects.requireNonNull(sanction.getAtrzCycl());
        process.prcsTypeCd = Objects.requireNonNull(type);
        process.trgtUserId = targetUserId;
        process.bfrUserId = beforeUserId;
        process.prcsCn = content;
        process.frstRgtrId = Objects.requireNonNull(actorId);
        process.crtDt = Objects.requireNonNull(at);
        return process;
    }
}
