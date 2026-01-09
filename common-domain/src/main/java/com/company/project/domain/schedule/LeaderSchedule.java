package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NLEADERSCHDUL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LeaderSchedule extends BaseTimeEntity {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String scheduleId;

    @Column(name = "SCHDUL_NM", length = 255, nullable = false)
    private String scheduleNm;

    @Column(name = "SCHDUL_CN", length = 2500)
    private String scheduleCn;

    @Column(name = "LEADER_ID", length = 20, nullable = false)
    private String leaderId;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String chargerId;

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String beginDate;

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String endDate;

    @Column(name = "REPTIT_YN", length = 1)
    private String repeatYn;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String importanceCode;

    @Column(name = "SCHDUL_SE", length = 1)
    private String scheduleType;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String scheduleNm, String scheduleCn, String chargerId, String beginDate, String endDate,
            String repeatYn, String importanceCode, String scheduleType, String lastUpdusrId) {
        this.scheduleNm = scheduleNm;
        this.scheduleCn = scheduleCn;
        this.chargerId = chargerId;
        this.beginDate = beginDate;
        this.endDate = endDate;
        this.repeatYn = repeatYn;
        this.importanceCode = importanceCode;
        this.scheduleType = scheduleType;
        this.lastUpdusrId = lastUpdusrId;
    }
}
