package com.company.project.domain.site;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사이트 정보 조회를 위한 JPA Entity
 * 대응 테이블 이름: COMTNSITEINFO
 */
@Entity(name = "SiteDomain")
@Table(name = "NSITEINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Site extends BaseEntity {

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

    @Builder
    public Site(String siteId, String siteUrl, String siteNm, String siteDc,
            String siteThemaClCode, String actvtyAt, String useAt) {
        this.siteId = siteId;
        this.siteUrl = siteUrl;
        this.siteNm = siteNm;
        this.siteDc = siteDc;
        this.siteThemaClCode = siteThemaClCode;
        this.actvtyAt = actvtyAt;
        this.useAt = useAt;
    }

    public void update(String siteUrl, String siteNm, String siteDc, String siteThemaClCode,
            String actvtyAt, String useAt) {
        this.siteUrl = siteUrl;
        this.siteNm = siteNm;
        this.siteDc = siteDc;
        this.siteThemaClCode = siteThemaClCode;
        this.actvtyAt = actvtyAt;
        this.useAt = useAt;
    }
}
