package com.company.project.domain.notification;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NMAINIMAGE")
public class MainImage extends BaseEntity {

    @Id
    @Column(name = "IMAGE_ID", length = 20)
    private String imageId;

    @Column(name = "IMAGE_NM", length = 60)
    private String imageNm;

    @Column(name = "IMAGE", length = 60)
    private String image;

    @Column(name = "IMAGE_DC", length = 200)
    private String imageDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "IMAGE_FILE", length = 60)
    private String imageFile;

    @Builder
    public MainImage(String imageId, String imageNm, String image, String imageDc, String reflctAt, String imageFile, String frstRegisterId) {
        this.imageId = imageId;
        this.imageNm = imageNm;
        this.image = image;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
        this.imageFile = imageFile;
        this.createdBy = frstRegisterId;
    }

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt, String userId) {
        this.imageNm = imageNm;
        this.image = image;
        this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
        this.lastModifiedBy = userId;
    }
}
