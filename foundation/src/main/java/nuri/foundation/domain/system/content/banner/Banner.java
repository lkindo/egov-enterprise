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
@Table(name = "tb_bnr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Banner extends BaseEntity {

    @Id
    @Column(name = "bnr_id", length = 20)
    private String bnrId;

    @Column(name = "bnr_nm", length = 100, nullable = false)
    private String bnrNm;

    @Column(name = "link_url", length = 512)
    private String linkUrl;

    @Column(name = "bnr_img_nm", length = 100)
    private String bnrImgNm;

    @Column(name = "bnr_expln", length = 4000)
    private String bnrExpln;

    @Column(name = "sort_ordr")
    private Integer sortOrdr;

    @Column(name = "rflt_yn", length = 1)
    private String rfltYn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    public void update(String bnrNm, String linkUrl, String bnrImgNm,
                      String bnrExpln, Integer sortOrdr, String rfltYn, String atchFileId) {
        this.bnrNm = bnrNm;
        this.linkUrl = linkUrl;
        if (bnrImgNm != null) this.bnrImgNm = bnrImgNm;
        this.bnrExpln = bnrExpln;
        this.sortOrdr = sortOrdr;
        this.rfltYn = rfltYn;
        if (atchFileId != null) this.atchFileId = atchFileId;
    }
}
