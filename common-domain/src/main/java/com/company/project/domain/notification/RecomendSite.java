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

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NRECOMENDSITEINFO")
public class RecomendSite {

    @Id
    @Column(name = "RECOMEND_SITE_ID", length = 20)
    private String recomendSiteId;

    @Column(name = "RECOMEND_SITE_URL", length = 255)
    private String recomendSiteUrl;

    @Column(name = "RECOMEND_SITE_NM", length = 255)
    private String recomendSiteNm;

    @Column(name = "RECOMEND_SITE_DC", length = 1000)
    private String recomendSiteDc;

    @Column(name = "RECOMEND_RESN_CN", length = 1000)
    private String recomendResnCn;

    @Column(name = "RECOMEND_CONFM_AT", length = 1)
    private String recomendConfmAt;

    @Column(name = "CONFM_DE", length = 20)
    private String confmDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public RecomendSite(String recomendSiteId, String recomendSiteUrl, String recomendSiteNm, String recomendSiteDc,
            String recomendResnCn, String recomendConfmAt, String confmDe, String frstRegisterId) {
        this.recomendSiteId = recomendSiteId;
        this.recomendSiteUrl = recomendSiteUrl;
        this.recomendSiteNm = recomendSiteNm;
        this.recomendSiteDc = recomendSiteDc;
        this.recomendResnCn = recomendResnCn;
        this.recomendConfmAt = recomendConfmAt;
        this.confmDe = confmDe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String recomendSiteUrl, String recomendSiteNm, String recomendSiteDc, String recomendResnCn,
            String recomendConfmAt, String confmDe, String lastUpdusrId) {
        this.recomendSiteUrl = recomendSiteUrl;
        this.recomendSiteNm = recomendSiteNm;
        this.recomendSiteDc = recomendSiteDc;
        this.recomendResnCn = recomendResnCn;
        this.recomendConfmAt = recomendConfmAt;
        this.confmDe = confmDe;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
