package com.company.project.service.digitalassetmanagement.dto;

import com.company.project.domain.digitalassetmanagement.MapTeam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "부서별 지식맵 정보 DTO")
public class MapTeamDto {
    @Schema(description = "조직(부서) ID")
    private String organizationId;

    @Schema(description = "조직(부서) 명칭")
    private String organizationName;

    @Schema(description = "분류 일자")
    private String classificationDate;

    @Schema(description = "지식 URL")
    private String knowledgeUrl;

    @Schema(description = "최종 수정자 ID")
    private String lastModifiedBy;

    public static MapTeamDto from(MapTeam entity) {
        if (entity == null)
            return null;
        return MapTeamDto.builder()
                .organizationId(entity.getOrganizationId())
                .organizationName(entity.getOrganizationName())
                .classificationDate(entity.getClassificationDate())
                .knowledgeUrl(entity.getKnowledgeUrl())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }
}
