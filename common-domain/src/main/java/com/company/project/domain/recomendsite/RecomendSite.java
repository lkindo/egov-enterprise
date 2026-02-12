package com.company.project.domain.recomendsite;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 추천사이트정보 JPA Entity
 * 레거시 테이블: NRECOMENDSITEINFO
 */
@Entity
@Table(name = "NRECOMENDSITEINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecomendSite extends BaseEntity {

    @Id
    @Column(name = "RECOMEND_SITE_ID", length = 20)
    private String recomendSiteId;

    @Column(name = "RECOMEND_SITE_URL", length = 255)
    private String recomendSiteUrl;

    @Column(name = "RECOMEND_SITE_NM", length = 100, nullable = false)
    private String recomendSiteNm;

    @Column(name = "RECOMEND_SITE_DC", length = 1000)
    private String recomendSiteDc;

    @Column(name = "RECOMEND_RESN_CN", length = 1000)
    private String recomendResnCn;

    @Column(name = "RECOMEND_CONFM_AT", length = 1)
    private String recomendConfmAt;

    @Column(name = "CONFM_DE", length = 20)
    private String confmDe;

    @Builder
    public RecomendSite(String recomendSiteId, String recomendSiteUrl, String recomendSiteNm,
                        String recomendSiteDc, String recomendResnCn, String recomendConfmAt,
                        String confmDe) {
        this.recomendSiteId = recomendSiteId;
        this.recomendSiteUrl = recomendSiteUrl;
        this.recomendSiteNm = recomendSiteNm;
        this.recomendSiteDc = recomendSiteDc;
        this.recomendResnCn = recomendResnCn;
        this.recomendConfmAt = recomendConfmAt != null ? recomendConfmAt : "N";
        this.confmDe = confmDe;
    }

    public void update(String recomendSiteUrl, String recomendSiteNm, String recomendSiteDc,
                      String recomendResnCn, String recomendConfmAt, String confmDe) {
        this.recomendSiteUrl = recomendSiteUrl;
        this.recomendSiteNm = recomendSiteNm;
        this.recomendSiteDc = recomendSiteDc;
        this.recomendResnCn = recomendResnCn;
        this.recomendConfmAt = recomendConfmAt;
        this.confmDe = confmDe;
    }
}
