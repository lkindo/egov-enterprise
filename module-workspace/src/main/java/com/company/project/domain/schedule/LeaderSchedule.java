package com.company.project.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 리더 일정 Entity
 * 매핑 테이블: NLEADERSCHDUL
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NLEADERSCHDUL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaderSchedule extends BaseEntity {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String scheduleId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String scheduleSe;

    @Column(name = "SCHDUL_NM", length = 255, nullable = false)
    private String scheduleNm;

    @Column(name = "SCHDUL_CN", length = 2500)
    private String scheduleCn;

    @Column(name = "SCHDUL_PLACE", length = 255)
    private String schedulePlace;

    @Column(name = "LEADER_ID", length = 20, nullable = false)
    private String leaderId;

    @Column(name = "REPTIT_SE_CODE", length = 1)
    private String reptitSeCode;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String scheduleIpcrCode;

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String beginDate;

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String endDate;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String chargerId;

    public void update(String scheduleSe, String scheduleNm, String scheduleCn, String schedulePlace,
                      String leaderId, String reptitSeCode, String scheduleIpcrCode,
                      String beginDate, String endDate, String chargerId, String userId) {
        this.scheduleSe = scheduleSe;
        this.scheduleNm = scheduleNm;
        this.scheduleCn = scheduleCn;
        this.schedulePlace = schedulePlace;
        this.leaderId = leaderId;
        this.reptitSeCode = reptitSeCode;
        this.scheduleIpcrCode = scheduleIpcrCode;
        this.beginDate = beginDate;
        this.endDate = endDate;
        this.chargerId = chargerId;
        this.setLastModifiedBy(userId);
    }
}
