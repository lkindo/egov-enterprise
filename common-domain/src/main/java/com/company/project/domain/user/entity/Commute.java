package com.company.project.domain.user.entity;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NWRKTMINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Commute extends BaseTimeEntity {

    @Id
    @Column(name = "WRKTM_ID", length = 20)
    private String commuteId;

    @Column(name = "EMPLYR_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "WRK_START_TIME", length = 20)
    private String startTime;

    @Column(name = "WRK_END_TIME", length = 20)
    private String endTime;

    @Column(name = "WRK_HOURS", length = 10)
    private String workHours;

    @Column(name = "OVTMWRK_HOURS", length = 10)
    private String overtimeHours;

    @Column(name = "WRK_START_STATUS", length = 20)
    private String startStatus;

    @Column(name = "WRK_END_STATUS", length = 20)
    private String endStatus;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void updateEndTime(String endTime, String workHours, String overtimeHours, String endStatus,
            String lastUpdusrId) {
        this.endTime = endTime;
        this.workHours = workHours;
        this.overtimeHours = overtimeHours;
        this.endStatus = endStatus;
        this.lastUpdusrId = lastUpdusrId;
    }
}