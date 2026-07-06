package nuri.business.domain.system.content.banner;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * 배너 정보 Entity
 * 매핑 테이블: TB_BNR_INFO
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_bnr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Banner extends BaseEntity {

    @Id
    @Column(length = 20)
    private String bnrId;

    @Column(length = 100, nullable = false)
    private String bnrNm;

    @Column(length = 512)
    private String linkUrl;

    @Column(length = 100)
    private String bnrImgNm;

    @Column(length = 4000)
    private String bnrExpln;

    private Integer sortOrdr;

    @Column(length = 1)
    private String rfltYn;

    @Column(length = 20)
    private String atchFileId;

    private Banner(String bnrId, String bnrNm, String linkUrl, String bnrImgNm,
                   String bnrExpln, Integer sortOrdr, String rfltYn, String atchFileId) {
        this.bnrId = bnrId;
        this.bnrNm = bnrNm;
        this.linkUrl = linkUrl;
        this.bnrImgNm = bnrImgNm;
        this.bnrExpln = bnrExpln;
        this.sortOrdr = sortOrdr;
        this.rfltYn = rfltYn;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static Banner create(String bnrId, String bnrNm, String linkUrl, String bnrImgNm,
                                String bnrExpln, Integer sortOrdr, String rfltYn, String atchFileId) {
        return new Banner(bnrId, bnrNm, linkUrl, bnrImgNm, bnrExpln, sortOrdr, rfltYn, atchFileId);
    }

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
