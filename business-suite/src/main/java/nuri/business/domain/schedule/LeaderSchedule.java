package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "TB_LEADER_SCHDL_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class LeaderSchedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdlId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdlSeCd;

    @Column(name = "LEADER_ID", length = 20, nullable = false)
    private String leaderId;

    @Column(name = "SCHDUL_TTL", length = 255, nullable = false)
    private String schdlTtl;

    @Column(name = "SCHDUL_CN", columnDefinition = "TEXT")
    private String schdlCn;

    @Column(name = "REPT_ITV_VAL", length = 1)
    private String reptitSeCd;

    @Column(name = "SCHDUL_IPCR_CD", length = 20)
    private String schdlIpcrCd;

    @Column(name = "BGNG_YMD", length = 20)
    private String bgngYmd;

    @Column(name = "END_YMD", length = 20)
    private String endYmd;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdlPicId;

    public void update(String schdlSeCd, String leaderId, String schdlTtl, String schdlCn,
                       String reptitSeCd, String schdlIpcrCd, String bgngYmd, String endYmd, String schdlPicId) {
        this.schdlSeCd = schdlSeCd;
        this.leaderId = leaderId;
        this.schdlTtl = schdlTtl;
        this.schdlCn = schdlCn;
        this.reptitSeCd = reptitSeCd;
        this.schdlIpcrCd = schdlIpcrCd;
        this.bgngYmd = bgngYmd;
        this.endYmd = endYmd;
        this.schdlPicId = schdlPicId;
    }
}
