package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NMAINIMAGE")
public class MainImage {

    @Id
    @Column(name = "IMAGE_ID", length = 20)
    private String imageId;

    @Column(name = "IMAGE_NM", length = 100)
    private String imageNm;

    @Column(name = "IMAGE", length = 50)
    private String image;

    @Column(name = "IMAGE_FILE", length = 20)
    private String imageFile;

    @Column(name = "IMAGE_DC", length = 1000)
    private String imageDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MainImage(String imageId, String imageNm, String image, String imageFile, String imageDc, String reflctAt,
            String frstRegisterId) {
        this.imageId = imageId;
        this.imageNm = imageNm;
        this.image = image;
        this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String imageNm, String image, String imageFile, String imageDc, String reflctAt,
            String lastUpdusrId) {
        this.imageNm = imageNm;
        this.image = image;
        this.imageFile = imageFile;
        this.imageDc = imageDc;
        this.reflctAt = reflctAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
