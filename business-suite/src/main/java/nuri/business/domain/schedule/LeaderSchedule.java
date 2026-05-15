package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 리더 일정 Entity
 * 매핑 테이블: NLEADERSCHDUL
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_LEADER_SCHDL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaderSchedule extends BaseEntity {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdlId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdlSeCd;

    @Column(name = "SCHDUL_NM", length = 255, nullable = false)
    private String schdlTtl;

    @Column(name = "SCHDUL_CN", length = 2500)
    private String schdlCn;

    @Column(name = "SCHDUL_PLACE", length = 255)
    private String schdlPlcNm;

    @Column(name = "LEADER_ID", length = 20, nullable = false)
    private String leaderId;

    @Column(name = "REPTIT_SE_CODE", length = 1)
    private String reptitSeCd;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String schdlIpcrCd;

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String bgngYmd;

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String endYmd;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdlPicId;

    public void update(String schdlSeCd, String schdlTtl, String schdlCn, String schdlPlcNm,
                      String leaderId, String reptitSeCd, String schdlIpcrCd,
                      String bgngYmd, String endYmd, String schdlPicId, String userId) {
        this.schdlSeCd = schdlSeCd;
        this.schdlTtl = schdlTtl;
        this.schdlCn = schdlCn;
        this.schdlPlcNm = schdlPlcNm;
        this.leaderId = leaderId;
        this.reptitSeCd = reptitSeCd;
        this.schdlIpcrCd = schdlIpcrCd;
        this.bgngYmd = bgngYmd;
        this.endYmd = endYmd;
        this.schdlPicId = schdlPicId;
        this.setLastModifiedBy(userId);
    }
}
