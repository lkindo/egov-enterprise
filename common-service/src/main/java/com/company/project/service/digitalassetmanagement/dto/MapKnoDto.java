package com.company.project.service.digitalassetmanagement.dto;

import com.company.project.domain.digitalassetmanagement.MapKno;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "지식맵 정보 DTO")
public class MapKnoDto {
    @Schema(description = "지식 유형 코드")
    private String typeCode;

    @Schema(description = "지식 유형 명칭")
    private String typeName;

    @Schema(description = "조직(부서) ID")
    private String organizationId;

    @Schema(description = "조직(부서) 명칭")
    private String organizationName;

    @Schema(description = "전문가 ID")
    private String expertId;

    @Schema(description = "분류 일자")
    private String classificationDate;

    @Schema(description = "지식 URL")
    private String knowledgeUrl;

    @Schema(description = "최초 등록자 ID")
    private String firstRegisterId;

    public static MapKnoDto from(MapKno entity) {
        if (entity == null)
            return null;
        return MapKnoDto.builder()
                .typeCode(entity.getTypeCode())
                .typeName(entity.getTypeName())
                .organizationId(entity.getOrganizationId())
                .expertId(entity.getExpertId())
                .classificationDate(entity.getClassificationDate())
                .knowledgeUrl(entity.getKnowledgeUrl())
                .firstRegisterId(entity.getCreatedBy())
                .build();
    }
}