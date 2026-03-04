package com.company.project.domain.monitoring;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NPROCESSMONLOGINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessMonitoringLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "PROCS_ID", length = 20)
    private String processId;

    @Column(name = "PROCS_NM", length = 255)
    private String processNm;

    @Column(name = "PROCS_STTUS", length = 2)
    private String procsSttus;

    @Column(name = "LOG_INFO", length = 2000)
    private String logInfo;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public ProcessMonitoringLog(String logId, String processId, String processNm, String procsSttus,
            String logInfo, String mngrNm, String mngrEmailAddr, LocalDateTime creatDt, String frstRegisterId) {
        this.logId = logId;
        this.processId = processId;
        this.processNm = processNm;
        this.procsSttus = procsSttus;
        this.logInfo = logInfo;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.creatDt = creatDt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }
}