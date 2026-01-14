package com.company.project.domain.banner;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 배너 JPA Entity
 * 레거시 테이블: COMTNBANNER
 */
@Entity
@Table(name = "NBANNER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Banner {

    @Id
    @Column(name = "BANNER_ID", length = 20)
    private String bannerId;

    @Column(name = "BANNER_NM", length = 100, nullable = false)
    private String bannerNm;

    @Column(name = "LINK_URL", length = 255)
    private String linkUrl;

    @Column(name = "BANNER_IMAGE", length = 100)
    private String bannerImage;

    @Column(name = "BANNER_DC", length = 1000)
    private String bannerDc;

    @Column(name = "SORT_ORDR")
    private Integer sortOrdr;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "REG_DATE")
    private LocalDateTime regDate;

    @Builder
    public Banner(String bannerId, String bannerNm, String linkUrl, String bannerImage,
            String bannerDc, Integer sortOrdr, String reflctAt, String userId) {
        this.bannerId = bannerId;
        this.bannerNm = bannerNm;
        this.linkUrl = linkUrl;
        this.bannerImage = bannerImage;
        this.bannerDc = bannerDc;
        this.sortOrdr = sortOrdr;
        this.reflctAt = reflctAt;
        this.userId = userId;
        this.regDate = LocalDateTime.now();
    }

    public void update(String bannerNm, String linkUrl, String bannerImage,
            String bannerDc, Integer sortOrdr, String reflctAt) {
        this.bannerNm = bannerNm;
        this.linkUrl = linkUrl;
        this.bannerImage = bannerImage;
        this.bannerDc = bannerDc;
        this.sortOrdr = sortOrdr;
        this.reflctAt = reflctAt;
    }
}
