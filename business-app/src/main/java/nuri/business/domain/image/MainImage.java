package nuri.business.domain.image;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 메인 이미지 엔티티
 */
@Entity
@Table(name = "tb_main_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MainImage extends BaseEntity {

    @Id
    @Column(length = 20)
    private String imgId;

    @Column(length = 100, nullable = false)
    private String imgNm;

    @Column(length = 50)
    private String mainImgFilePath;

    @Column(length = 100)
    private String imgFileNm;

    @Column(length = 4000)
    private String mainImgExpln;

    @Column(length = 1)
    private String rfltYn;

    private MainImage(String imgId, String imgNm, String mainImgFilePath, String imgFileNm, String mainImgExpln, String rfltYn) {
        this.imgId = imgId;
        this.imgNm = imgNm;
        this.mainImgFilePath = mainImgFilePath;
        this.imgFileNm = imgFileNm;
        this.mainImgExpln = mainImgExpln;
        this.rfltYn = rfltYn;
    }

    @Builder
    public static MainImage create(String imgId, String imgNm, String mainImgFilePath, String imgFileNm, String mainImgExpln, String rfltYn) {
        return new MainImage(imgId, imgNm, mainImgFilePath, imgFileNm, mainImgExpln, rfltYn);
    }

    public void update(String imgNm, String mainImgFilePath, String imgFileNm, String mainImgExpln, String rfltYn) {
        this.imgNm = imgNm;
        if (mainImgFilePath != null) this.mainImgFilePath = mainImgFilePath;
        if (imgFileNm != null) this.imgFileNm = imgFileNm;
        this.mainImgExpln = mainImgExpln;
        this.rfltYn = rfltYn;
    }
}
