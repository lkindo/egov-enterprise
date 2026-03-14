package com.company.project.domain.image;

import com.company.project.domain.common.BaseEntity;
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
@Entity
@Table(name = "NMAINIMAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class MainImage extends BaseEntity {

    @Id
    @Column(name = "IMAGE_ID", length = 20)
    private String imageId;

    @Column(name = "IMAGE_NM", length = 100, nullable = false)
    private String imageNm;

    @Column(name = "IMAGE", length = 50)
    private String image;

    @Column(name = "IMAGE_FILE", length = 20)
    private String imageFile;

    @Column(name = "IMAGE_DC", length = 1000)
    private String imageDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt) {
        this.imageNm = imageNm;
        if (image != null) this.image = image;
        if (imageFile != null) this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
    }
}
