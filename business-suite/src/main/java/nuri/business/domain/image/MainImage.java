package nuri.business.domain.image;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 메인 이미지 엔티티
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_main_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class MainImage extends BaseEntity {

    @Id
    @Column(name = "img_id", length = 20)
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

    public void update(String imgNm, String mainImgFilePath, String imgFileNm, String mainImgExpln, String rfltYn) {
        this.imgNm = imgNm;
        if (mainImgFilePath != null) this.mainImgFilePath = mainImgFilePath;
        if (imgFileNm != null) this.imgFileNm = imgFileNm;
        this.mainImgExpln = mainImgExpln;
        this.rfltYn = rfltYn;
    }
}
