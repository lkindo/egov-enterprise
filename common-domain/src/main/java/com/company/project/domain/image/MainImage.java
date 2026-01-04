package com.company.project.domain.image;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;

/**
 * 메인 이미지 관리 엔티티
 */
@Entity
@Table(name = "NMAINIMAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MainImage extends BaseTimeEntity {

    @Id
    @Column(name = "IMAGE_ID", length = 20)
    private String imageId;

    @Column(name = "IMAGE_NM", length = 60, nullable = false)
    private String imageNm;

    @Column(name = "IMAGE", length = 255)
    private String image;

    @Column(name = "IMAGE_FILE", length = 20)
    private String imageFile;

    @Column(name = "IMAGE_DC", length = 200)
    private String imageDc;

    @Column(name = "REFLCT_AT", length = 1, nullable = false)
    private String reflctAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt,
            String lastUpdusrId) {
        this.imageNm = imageNm;
        this.image = image;
        this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
