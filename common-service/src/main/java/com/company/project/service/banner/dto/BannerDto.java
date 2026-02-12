package com.company.project.service.banner.dto;

import com.company.project.domain.banner.Banner;
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
@Schema(description = "배너 정보 DTO")
public class BannerDto {

    @Schema(description = "배너 ID")
    private String bannerId;

    @Schema(description = "배너 명")
    private String bannerNm;

    @Schema(description = "링크 URL")
    private String linkUrl;

    @Schema(description = "배너 이미지 명")
    private String bannerImage;

    @Schema(description = "배너 설명")
    private String bannerDc;

    @Schema(description = "정렬 순서")
    private Integer sortOrdr;

    @Schema(description = "반영 여부")
    private String reflctAt;

    @Schema(description = "배너 이미지 파일 ID")
    private String bannerImageFile;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static BannerDto from(Banner entity) {
        if (entity == null) return null;
        return BannerDto.builder()
                .bannerId(entity.getBannerId())
                .bannerNm(entity.getBannerNm())
                .linkUrl(entity.getLinkUrl())
                .bannerImage(entity.getBannerImage())
                .bannerDc(entity.getBannerDc())
                .sortOrdr(entity.getSortOrdr())
                .reflctAt(entity.getReflctAt())
                .bannerImageFile(entity.getBannerImageFile())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
