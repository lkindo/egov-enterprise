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
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "NHTTPMON")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicUpdate
public class HttpMonitoring {

    @Id
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

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "DELETE_AT", length = 1)
    private String deleteAt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public HttpMonitoring(String sysId, String webKind, String siteUrl, String httpSttusCd,
            String mngrNm, String mngrEmailAddr, String frstRegisterId) {
        this.sysId = sysId;
        this.webKind = webKind;
        this.siteUrl = siteUrl;
        this.httpSttusCd = httpSttusCd;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.deleteAt = "N";
        this.creatDt = LocalDateTime.now();
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String webKind, String siteUrl, String mngrNm, String mngrEmailAddr, String lastUpdusrId) {
        this.webKind = webKind;
        this.siteUrl = siteUrl;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete() {
        this.deleteAt = "Y";
    }

    public void updateStatus(String httpSttusCd, LocalDateTime creatDt, String lastUpdusrId) {
        this.httpSttusCd = httpSttusCd;
        this.creatDt = creatDt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }
}
