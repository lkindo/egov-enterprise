package nuri.business.domain.image;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
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
    @com.fasterxml.jackson.annotation.JsonProperty("imageId")
    private String imgId;

    @Column(length = 100, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("imageNm")
    private String imgNm;

    @Column(length = 50)
    @com.fasterxml.jackson.annotation.JsonProperty("image")
    private String mainImgFilePath;

    @Column(length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("imageFile")
    private String imgFileNm;

    @Column(length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("imageDc")
    private String mainImgExpln;

    @Column(length = 1)
    @com.fasterxml.jackson.annotation.JsonProperty("reflctAt")
    private String rfltYn;

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt) {
        this.imgNm = imageNm;
        if (image != null) this.mainImgFilePath = image;
        if (imageFile != null) this.imgFileNm = imageFile;
        this.mainImgExpln = imageDc;
        this.rfltYn = reflctAt;
    }

    // ----- [Legacy Aliases & Compatibility Bridge] -----

    public String getImageId() {
        return this.imgId;
    }

    public void setImageId(String imageId) {
        this.imgId = imageId;
    }

    public String getImageNm() {
        return this.imgNm;
    }

    public void setImageNm(String imageNm) {
        this.imgNm = imageNm;
    }

    public String getImage() {
        return this.mainImgFilePath;
    }

    public void setImage(String image) {
        this.mainImgFilePath = image;
    }

    public String getImageFile() {
        return this.imgFileNm;
    }

    public void setImageFile(String imageFile) {
        this.imgFileNm = imageFile;
    }

    public String getImageDc() {
        return this.mainImgExpln;
    }

    public void setImageDc(String imageDc) {
        this.mainImgExpln = imageDc;
    }

    public String getReflctAt() {
        return this.rfltYn;
    }

    public void setReflctAt(String reflctAt) {
        this.rfltYn = reflctAt;
    }

    public static abstract class MainImageBuilder<C extends MainImage, B extends MainImageBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String imgId;
        private String imgNm;
        private String mainImgFilePath;
        private String imgFileNm;
        private String mainImgExpln;
        private String rfltYn;

        public B imageId(String imageId) {
            this.imgId = imageId;
            return self();
        }

        public B imageNm(String imageNm) {
            this.imgNm = imageNm;
            return self();
        }

        public B image(String image) {
            this.mainImgFilePath = image;
            return self();
        }

        public B imageFile(String imageFile) {
            this.imgFileNm = imageFile;
            return self();
        }

        public B imageDc(String imageDc) {
            this.mainImgExpln = imageDc;
            return self();
        }

        public B reflctAt(String reflctAt) {
            this.rfltYn = reflctAt;
            return self();
        }
    }
}
