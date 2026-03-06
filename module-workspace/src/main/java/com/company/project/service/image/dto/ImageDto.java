package com.company.project.service.image.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageDto {
    private String imageId;
    private String imageNm;
    private String image;
    private String imageFile;
    private String imageDc;
    private String reflctAt;
}
