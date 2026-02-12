package com.company.project.service.image.dto;

import com.company.project.domain.image.MainImage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "메인 이미지 정보 DTO")
public class MainImageDto {

    @Schema(description = "이미지 ID")
    private String imageId;

    @Schema(description = "이미지 명")
    private String imageNm;

    @Schema(description = "이미지")
    private String image;

    @Schema(description = "이미지 파일 ID")
    private String imageFile;

    @Schema(description = "이미지 설명")
    private String imageDc;

    @Schema(description = "반영 여부")
    private String reflctAt;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static MainImageDto from(MainImage entity) {
        if (entity == null) return null;
        return MainImageDto.builder()
                .imageId(entity.getImageId())
                .imageNm(entity.getImageNm())
                .image(entity.getImage())
                .imageFile(entity.getImageFile())
                .imageDc(entity.getImageDc())
                .reflctAt(entity.getReflctAt())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
