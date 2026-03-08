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
@Schema(description = "Description")
public class BannerDto {

    @Schema(description = "Description")
    private String bannerId;

    @Schema(description = "Description")
    private String bannerNm;

    @Schema(description = "Description")
    private String linkUrl;

    @Schema(description = "Description")
    private String bannerImage;

    @Schema(description = "Description")
    private String bannerDc;

    @Schema(description = "Description")
    private Integer sortOrdr;

    @Schema(description = "Description")
    private String reflctAt;

    @Schema(description = "Description")
    private String bannerImageFile;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
