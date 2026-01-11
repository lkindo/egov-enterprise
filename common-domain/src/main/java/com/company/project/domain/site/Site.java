package com.company.project.domain.site;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사이트정보 JPA Entity
 * 레거시 테이블: COMTNSITEINFO
 */
@Entity(name = "SiteDomain")
@Table(name = "COMTNSITEINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Site {

    @Id
    @Column(name = "SITE_ID", length = 20)
    private String siteId;

    @Column(name = "SITE_URL", length = 100)
    private String siteUrl;

    @Column(name = "SITE_NM", length = 100, nullable = false)
    private String siteNm;

    @Column(name = "SITE_DC", length = 1000)
    private String siteDc;

    @Column(name = "SITE_THEMA_CL_CODE", length = 20)
    private String siteThemaClCode;

    @Column(name = "ACTVTY_AT", length = 1)
    private String actvtyAt;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Site(String siteId, String siteUrl, String siteNm, String siteDc,
            String siteThemaClCode, String actvtyAt, String useAt, String frstRegisterId) {
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

    public void update(String siteUrl, String siteNm, String siteDc, String siteThemaClCode,
            String actvtyAt, String useAt, String updusrId) {
        this.siteUrl = siteUrl;
        this.siteNm = siteNm;
        this.siteDc = siteDc;
        this.siteThemaClCode = siteThemaClCode;
        this.actvtyAt = actvtyAt;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
