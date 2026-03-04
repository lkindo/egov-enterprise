package com.company.project.domain.commute;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity(name = "CommuteDomain")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NCOMMUTE")
public class Commute {

    @Id
    @Column(name = "WRKTM_ID", length = 20)
    private String wrktmId;

    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "WRKT_DT", length = 10)
    private String wrktDt; // YYYYMMDD?

    @Column(name = "WRK_START_TIME", length = 5)
    private String wrkStartTime;

    @Column(name = "WRK_END_TIME", length = 5)
    private String wrkEndTime;

    @Column(name = "WRK_HOURS", length = 2)
    private String wrkHours;

    @Column(name = "OVTMWRK_HOURS", length = 2)
    private String ovtmwrkHours;

    @Column(name = "WRK_START_STATUS", length = 100)
    private String wrkStartStatus;

    @Column(name = "WRK_END_STATUS", length = 100)
    private String wrkEndStatus;

    @Column(name = "RM", length = 255)
    private String rm;

    @Builder
    public Commute(String wrktmId, String emplyrId, String orgnztId, String wrktDt, String wrkStartTime,
            String wrkEndTime,
            String wrkHours, String ovtmwrkHours, String wrkStartStatus, String wrkEndStatus, String rm) {
        this.wrktmId = wrktmId;
        this.emplyrId = emplyrId;
        this.orgnztId = orgnztId;
        this.wrktDt = wrktDt;
        this.wrkStartTime = wrkStartTime;
        this.wrkEndTime = wrkEndTime;
        this.wrkHours = wrkHours;
        this.ovtmwrkHours = ovtmwrkHours;
        this.wrkStartStatus = wrkStartStatus;
        this.wrkEndStatus = wrkEndStatus;
        this.rm = rm;
    }

    public void updateEndTime(String wrkEndTime, String wrkHours, String ovtmwrkHours, String wrkStartStatus,
            String wrkEndStatus) {
        this.wrkEndTime = wrkEndTime;
        this.wrkHours = wrkHours;
        this.ovtmwrkHours = ovtmwrkHours;
        this.wrkStartStatus = wrkStartStatus;
        this.wrkEndStatus = wrkEndStatus;
    }
}