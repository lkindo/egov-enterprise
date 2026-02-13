package com.company.project.domain.system;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "IMGTEMP")
public class ImgTemp {

    @EmbeddedId
    private ImgTempId id;

    @Lob
    @Column(name = "IMAGE_INFO")
    private byte[] imageInfo;

    @Column(name = "IMAGE_TY", length = 20)
    private String imageType;
}
