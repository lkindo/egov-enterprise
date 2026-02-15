package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity(name = "NotificationSite")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NSITELIST")
public class Site {

    @Id
    @Column(name = "SITE_ID", length = 20)
    private String siteId;

    @Column(name = "SITE_URL", length = 255)
    private String siteUrl;

    @Column(name = "SITE_NM", length = 255)
    private String siteNm;

    @Column(name = "SITE_DC", length = 1000)
    private String siteDc;

    @Column(name = "SITE_THEMA_CL_CODE", length = 3)
    private String siteThemaClCode;

    @Column(name = "ACTVTY_AT", length = 1)
    private String actvtyAt;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Site(String siteId, String siteUrl, String siteNm, String siteDc, String siteThemaClCode, String actvtyAt,
            String useAt, String frstRegisterId) {
        this.siteId = siteId;
        this.siteUrl = siteUrl;
        this.siteNm = siteNm;
        this.siteDc = siteDc;
        this.siteThemaClCode = siteThemaClCode;
        this.actvtyAt = actvtyAt;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String siteUrl, String siteNm, String siteDc, String siteThemaClCode, String actvtyAt,
            String useAt, String lastUpdusrId) {
        this.siteUrl = siteUrl;
        this.siteNm = siteNm;
        this.siteDc = siteDc;
        this.siteThemaClCode = siteThemaClCode;
        this.actvtyAt = actvtyAt;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
