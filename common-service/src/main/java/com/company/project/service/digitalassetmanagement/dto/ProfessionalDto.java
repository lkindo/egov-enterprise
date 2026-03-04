package com.company.project.service.digitalassetmanagement.dto;

import com.company.project.domain.digitalassetmanagement.Professional;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "지상 전문가 정보 DTO")
public class ProfessionalDto {
    @Schema(description = "전문가 ID")
    private String expertId;

    @Schema(description = "사용자 명")
    private String userName;

    @Schema(description = "지식 유형 코드")
    private String typeCode;

    @Schema(description = "지식 유형 명칭")
    private String typeName;

    @Schema(description = "조직(부서) ID")
    private String organizationId;

    @Schema(description = "조직(부서) 명칭")
    private String organizationName;

    @Schema(description = "전문가 등급 코드")
    private String assessmentLevel;

    @Schema(description = "전문 분야")
    private String expertDescription;

    @Schema(description = "승인 일자")
    private String confirmedDate;

    @Schema(description = "최종 수정자 ID")
    private String lastModifiedBy;

    public static ProfessionalDto from(Professional entity) {
        if (entity == null)
            return null;
        return ProfessionalDto.builder()
                .expertId(entity.getExpertId())
                .typeCode(entity.getTypeCode())
                .assessmentLevel(entity.getAssessmentLevel())
                .expertDescription(entity.getExpertDescription())
                .confirmedDate(entity.getConfirmedDate())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }
}