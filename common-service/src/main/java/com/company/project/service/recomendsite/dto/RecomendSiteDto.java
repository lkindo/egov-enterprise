package com.company.project.service.recomendsite.dto;

import com.company.project.domain.recomendsite.RecomendSite;
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
@Schema(description = "추천사이트 정보 DTO")
public class RecomendSiteDto {

    @Schema(description = "추천사이트 ID")
    private String recomendSiteId;

    @Schema(description = "추천사이트 URL")
    private String recomendSiteUrl;

    @Schema(description = "추천사이트 명")
    private String recomendSiteNm;

    @Schema(description = "추천사이트 설명")
    private String recomendSiteDc;

    @Schema(description = "추천 사유")
    private String recomendResnCn;

    @Schema(description = "승인 여부")
    private String recomendConfmAt;

    @Schema(description = "승인 일자")
    private String confmDe;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static RecomendSiteDto from(RecomendSite entity) {
        if (entity == null) return null;
        return RecomendSiteDto.builder()
                .recomendSiteId(entity.getRecomendSiteId())
                .recomendSiteUrl(entity.getRecomendSiteUrl())
                .recomendSiteNm(entity.getRecomendSiteNm())
                .recomendSiteDc(entity.getRecomendSiteDc())
                .recomendResnCn(entity.getRecomendResnCn())
                .recomendConfmAt(entity.getRecomendConfmAt())
                .confmDe(entity.getConfmDe())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
