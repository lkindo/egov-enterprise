package com.company.project.service.site.dto;

import com.company.project.domain.site.Site;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * ????몄젙?DTO
 */
@Getter
@Builder
public class SiteDto {
    private String siteId;
    private String siteUrl;
    private String siteNm;
    private String siteDc;
    private String siteThemaClCode;
    private String actvtyAt;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static SiteDto from(Site entity) {
        if (entity == null)
            return null;
        return SiteDto.builder()
                .siteId(entity.getSiteId())
                .siteUrl(entity.getSiteUrl())
                .siteNm(entity.getSiteNm())
                .siteDc(entity.getSiteDc())
                .siteThemaClCode(entity.getSiteThemaClCode())
                .actvtyAt(entity.getActvtyAt())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
