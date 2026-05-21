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
    @Column(name = "image_id", length = 20)
    private String imageId;

    @Column(name = "image_nm", length = 100, nullable = false)
    private String imageNm;

    @Column(name = "main_img_file_path", length = 50)
    private String image;

    @Column(name = "image_file", length = 20)
    private String imageFile;

    @Column(name = "main_img_expln", length = 1000)
    private String imageDc;

    @Column(name = "reflct_at", length = 1)
    private String reflctAt;

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt) {
        this.imageNm = imageNm;
        if (image != null) this.image = image;
        if (imageFile != null) this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
    }
}
