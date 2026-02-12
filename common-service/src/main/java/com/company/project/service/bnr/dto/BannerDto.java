package com.company.project.service.bnr.dto;

import com.company.project.domain.banner.Banner;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerDto {
    private String bannerId;
    private String bannerNm;
    private String linkUrl;
    private String bannerImage;
    private String bannerDc;
    private Integer sortOrdr;
    private String reflctAt;
    private String userId;
    private LocalDateTime regDate;

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
                .userId(entity.getUserId())
                .regDate(entity.getRegDate())
                .build();
    }
}
