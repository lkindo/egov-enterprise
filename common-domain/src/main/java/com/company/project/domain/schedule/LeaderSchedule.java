package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 간부일정 정보 Entity
 * 레거시 테이블: NLEADERSCHDUL
 */
@Entity
@Table(name = "NLEADERSCHDUL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String beginDate;

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String endDate;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String chargerId;

    @Builder
    public LeaderSchedule(String scheduleId, String scheduleSe, String scheduleNm, String scheduleCn,
                         String schedulePlace, String leaderId, String reptitSeCode,
                         String beginDate, String endDate, String chargerId) {
        this.scheduleId = scheduleId;
        this.scheduleSe = scheduleSe;
        this.scheduleNm = scheduleNm;
        this.scheduleCn = scheduleCn;
        this.schedulePlace = schedulePlace;
        this.leaderId = leaderId;
        this.reptitSeCode = reptitSeCode;
        this.beginDate = beginDate;
        this.endDate = endDate;
        this.chargerId = chargerId;
    }

    public void update(String scheduleSe, String scheduleNm, String scheduleCn, String schedulePlace,
                      String leaderId, String reptitSeCode, String beginDate, String endDate, String chargerId) {
        this.scheduleSe = scheduleSe;
        this.scheduleNm = scheduleNm;
        this.scheduleCn = scheduleCn;
        this.schedulePlace = schedulePlace;
        this.leaderId = leaderId;
        this.reptitSeCode = reptitSeCode;
        this.beginDate = beginDate;
        this.endDate = endDate;
        this.chargerId = chargerId;
    }
}
