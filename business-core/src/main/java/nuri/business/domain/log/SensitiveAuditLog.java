package nuri.business.domain.log;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Objects;

/** Append-only sensitive-operation journal; identifiers survive account deletion without user FKs. */
@Entity
@Immutable
@Table(name = "tb_sys_adt_log", uniqueConstraints = @UniqueConstraint(
        name = "uk_tb_sys_adt_log_request_stage", columnNames = {"dmnd_idntfr", "prcs_stts_nm"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SensitiveAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sensitiveAuditLogSequence")
    @SequenceGenerator(name = "sensitiveAuditLogSequence", sequenceName = "sq_sys_adt_log", allocationSize = 1)
    @Column(name = "log_sn", precision = 22, scale = 0, nullable = false, updatable = false)
    private BigInteger logSn;
    @Column(name = "dmnd_idntfr", length = 50, nullable = false, updatable = false)
    private String dmndIdntfr;
    @Column(name = "prcs_stts_nm", length = 300, nullable = false, updatable = false)
    private String prcsSttsNm;
    @Column(name = "job_nm", length = 100, nullable = false, updatable = false)
    private String jobNm;
    @Column(name = "adt_cn", length = 4000, nullable = false, updatable = false)
    private String adtCn;
    @Column(name = "adt_dt", nullable = false, updatable = false)
    private LocalDateTime adtDt;
    @Column(name = "frst_rgtr_id", length = 20, nullable = false, updatable = false)
    private String frstRgtrId;
    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    public static SensitiveAuditLog create(String requestId, String stage, String operation,
                                          String snapshot, String actor, LocalDateTime occurredAt) {
        SensitiveAuditLog row = new SensitiveAuditLog();
        row.dmndIdntfr = Objects.requireNonNull(requestId);
        row.prcsSttsNm = Objects.requireNonNull(stage);
        row.jobNm = Objects.requireNonNull(operation);
        row.adtCn = Objects.requireNonNull(snapshot);
        row.frstRgtrId = Objects.requireNonNull(actor);
        row.adtDt = Objects.requireNonNull(occurredAt);
        row.crtDt = occurredAt;
        return row;
    }
}
