package com.company.project.domain.image;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 로그인 화면 이미지 엔티티
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NLOGINSCRINIMAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LoginImage extends BaseEntity {

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

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt) {
        this.imageNm = imageNm;
        this.image = image;
        this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
    }
}
