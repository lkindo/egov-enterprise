package com.company.project.domain.system.content.banner;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 배너 정보 Entity
 * 매핑 테이블: NBANNER
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NBANNER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Banner extends BaseEntity {

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

    @Column(name = "BANNER_IMAGE_FILE", length = 20)
    private String bannerImageFile;

    public void update(String bannerNm, String linkUrl, String bannerImage,
                      String bannerDc, Integer sortOrdr, String reflctAt, String bannerImageFile) {
        this.bannerNm = bannerNm;
        this.linkUrl = linkUrl;
        if (bannerImage != null) this.bannerImage = bannerImage;
        this.bannerDc = bannerDc;
        this.sortOrdr = sortOrdr;
        this.reflctAt = reflctAt;
        if (bannerImageFile != null) this.bannerImageFile = bannerImageFile;
    }
}
