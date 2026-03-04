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
@Table(name = "NNTWRKSVCMNTRNGLOGINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NetworkServiceMonitoringLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "SYS_IP", length = 23)
    private String sysIp;

    @Column(name = "SYS_PORT")
    private Integer sysPort;

    @Column(name = "SYS_NM", length = 255)
    private String sysNm;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "LOG_INFO", length = 2000)
    private String logInfo;

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
    public NetworkServiceMonitoringLog(String logId, String sysIp, Integer sysPort, String sysNm,
            String mntrngSttus, String logInfo, LocalDateTime creatDt, String frstRegisterId) {
        this.logId = logId;
        this.sysIp = sysIp;
        this.sysPort = sysPort;
        this.sysNm = sysNm;
        this.mntrngSttus = mntrngSttus;
        this.logInfo = logInfo;
        this.creatDt = creatDt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }
}