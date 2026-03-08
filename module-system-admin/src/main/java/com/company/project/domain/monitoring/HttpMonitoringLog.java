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
@Table(name = "HHTTPMONLOGINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HttpMonitoringLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "SYS_ID", length = 20)
    private String sysId;

    @Column(name = "WEBSVC_KND", length = 2)
    private String webKind;

    @Column(name = "SITE_URL", length = 100)
    private String siteUrl;

    @Column(name = "HTTP_STTUS_CODE", length = 3)
    private String httpSttusCd;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "LOG_INFO", length = 2000)
    private String logInfo;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public HttpMonitoringLog(String logId, String sysId, String webKind, String siteUrl, String httpSttusCd,
            LocalDateTime creatDt, String logInfo, String mngrNm, String mngrEmailAddr,
            String frstRegisterId, LocalDateTime frstRegisterPnttm) {
        this.logId = logId;
        this.sysId = sysId;
        this.webKind = webKind;
        this.siteUrl = siteUrl;
        this.httpSttusCd = httpSttusCd;
        this.creatDt = creatDt;
        this.logInfo = logInfo;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = frstRegisterPnttm != null ? frstRegisterPnttm : LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }
}
