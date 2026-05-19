package nuri.foundation.domain.system.content.banner;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 배너 정보 Entity
 * 매핑 테이블: TB_BNR_INFO
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BNR_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Banner extends BaseEntity {

    @Id
    @Column(name = "BNR_ID", length = 20)
    private String bannerId;

    @Column(name = "BNR_NM", length = 100, nullable = false)
    private String bannerNm;

    @Column(name = "LINK_URL", length = 255)
    private String linkUrl;

    @Column(name = "BNR_IMG_NM", length = 100)
    private String bannerImage;

    @Column(name = "BNR_EXPLN", length = 1000)
    private String bannerDc;

    @Column(name = "SORT_ORDR")
    private Integer sortOrdr;

    @Column(name = "RFLT_YN", length = 1)
    private String reflctAt;

    @Column(name = "ATCH_FILE_ID", length = 20)
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

    // legacy getters for compatibility
    public String getBnrId() { return bannerId; }
    public String getBnrNm() { return bannerNm; }
}
