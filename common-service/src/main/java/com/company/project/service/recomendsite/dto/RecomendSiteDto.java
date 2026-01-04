package com.company.project.service.recomendsite.dto;

import com.company.project.domain.recomendsite.RecomendSite;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 추천사이트정보 DTO
 */
@Getter
@Builder
public class RecomendSiteDto {
    private String recomendSiteId;
    private String recomendSiteUrl;
    private String recomendSiteNm;
    private String recomendSiteDc;
    private String recomendResnCn;
    private String recomendConfmAt;
    private String confmDe;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static RecomendSiteDto from(RecomendSite entity) {
        if (entity == null)
            return null;
        return RecomendSiteDto.builder()
                .recomendSiteId(entity.getRecomendSiteId())
                .recomendSiteUrl(entity.getRecomendSiteUrl())
                .recomendSiteNm(entity.getRecomendSiteNm())
                .recomendSiteDc(entity.getRecomendSiteDc())
                .recomendResnCn(entity.getRecomendResnCn())
                .recomendConfmAt(entity.getRecomendConfmAt())
                .confmDe(entity.getConfmDe())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
