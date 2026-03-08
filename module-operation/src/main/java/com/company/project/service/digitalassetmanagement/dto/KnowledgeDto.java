package com.company.project.service.digitalassetmanagement.dto;

import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
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
@Schema(description = "지식정보 DTO")
public class KnowledgeDto {
    @Schema(description = "지식 ID")
    private String knowledgeId;

    @Schema(description = "지식 명칭")
    private String title;

    @Schema(description = "지식 내용")
    private String content;

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

    @Schema(description = "전문가 명칭")
    private String expertName;

    @Schema(description = "공개 여부 (Y/N)")
    private String isPublic;

    @Schema(description = "평가 일자")
    private String evaluationDate;

    @Schema(description = "평가 등급")
    private String evaluationGrade;

    @Schema(description = "폐기 일자")
    private String disuseDate;

    @Schema(description = "첨부 파일 ID")
    private String attachedFileId;

    @Schema(description = "최초 등록자 ID")
    private String firstRegisterId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime createdDate;

    public static KnowledgeDto from(KnowledgeInf entity) {
        if (entity == null)
            return null;
        return KnowledgeDto.builder()
                .knowledgeId(entity.getKnowledgeId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .typeCode(entity.getTypeCode())
                .organizationId(entity.getOrganizationId())
                .expertId(entity.getExpertId())
                .isPublic(entity.getIsPublic())
                .evaluationDate(entity.getEvaluationDate())
                .evaluationGrade(entity.getEvaluationGrade())
                .disuseDate(entity.getDisuseDate())
                .attachedFileId(entity.getAttachedFileId())
                .firstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
