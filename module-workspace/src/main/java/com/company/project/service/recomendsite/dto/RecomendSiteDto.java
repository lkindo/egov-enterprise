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
@Schema(description = "Description")
public class RecomendSiteDto {

    @Schema(description = "Description")
    private String recomendSiteId;

    @Schema(description = "Description")
    private String recomendSiteUrl;

    @Schema(description = "Description")
    private String recomendSiteNm;

    @Schema(description = "Description")
    private String recomendSiteDc;

    @Schema(description = "Description")
    private String recomendResnCn;

    @Schema(description = "Description")
    private String recomendConfmAt;

    @Schema(description = "Description")
    private String confmDe;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
