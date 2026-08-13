package nuri.business.domain.system.content.banner;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * 배너 정보 Entity
 * 매핑 테이블: TB_BNR_INFO
 */
@Entity
@Table(name = "tb_bnr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Banner extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long bnrSn;

    @Column(length = 100, nullable = false)
    private String bnrNm;

    @Column(length = 512)
    private String linkUrl;

    @Column(length = 100)
    private String bnrImgNm;

    @Column(length = 4000)
    private String bnrExpln;

    private Long sortOrdr;

    @Column(length = 1)
    private String rfltYn;

    @Column(length = 20)
    private String atchFileId;

    private Banner(Long bnrSn, String bnrNm, String linkUrl, String bnrImgNm,
                   String bnrExpln, Long sortOrdr, String rfltYn, String atchFileId) {
        this.bnrSn = bnrSn;
        this.bnrNm = bnrNm;
        this.linkUrl = linkUrl;
        this.bnrImgNm = bnrImgNm;
        this.bnrExpln = bnrExpln;
        this.sortOrdr = sortOrdr;
        this.rfltYn = rfltYn;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static Banner create(Long bnrSn, String bnrNm, String linkUrl, String bnrImgNm,
                                String bnrExpln, Long sortOrdr, String rfltYn, String atchFileId) {
        return new Banner(bnrSn, bnrNm, linkUrl, bnrImgNm, bnrExpln, sortOrdr, rfltYn, atchFileId);
    }

    public void update(String bnrNm, String linkUrl, String bnrImgNm,
                      String bnrExpln, Long sortOrdr, String rfltYn, String atchFileId) {
        this.bnrNm = bnrNm;
        this.linkUrl = linkUrl;
        if (bnrImgNm != null) this.bnrImgNm = bnrImgNm;
        this.bnrExpln = bnrExpln;
        this.sortOrdr = sortOrdr;
        this.rfltYn = rfltYn;
        if (atchFileId != null) this.atchFileId = atchFileId;
    }
}
