package com.company.project.service.digitalassetmanagement.dto;

import com.company.project.domain.digitalassetmanagement.KnowledgeRequest;
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
@Schema(description = "지식요청 정보 DTO")
public class KnowledgeRequestDto {
    @Schema(description = "지식 ID")
    private String knowledgeId;

    @Schema(description = "지식 명칭")
    private String title;

    @Schema(description = "지식 내용")
    private String content;

    @Schema(description = "지식 유형 코드")
    private String typeCode;

    @Schema(description = "조직(부서) ID")
    private String organizationId;

    @Schema(description = "전문가 ID")
    private String expertId;

    @Schema(description = "사용자 ID")
    private String userId;

    @Schema(description = "첨부 파일 ID")
    private String attachedFileId;

    @Schema(description = "상위 질문/답변 ID")
    private String parentKnowledgeId;

    @Schema(description = "답변 깊이")
    private Integer answerDepth;

    @Schema(description = "답변 순서")
    private Integer answerOrder;

    @Schema(description = "답변 그룹 번호")
    private Long answerGroupNumber;

    @Schema(description = "최초 등록자 ID")
    private String firstRegisterId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime createdDate;

    public static KnowledgeRequestDto from(KnowledgeRequest entity) {
        if (entity == null)
            return null;
        return KnowledgeRequestDto.builder()
                .knowledgeId(entity.getKnowledgeId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .typeCode(entity.getTypeCode())
                .organizationId(entity.getOrganizationId())
                .expertId(entity.getExpertId())
                .userId(entity.getEmplyrId())
                .attachedFileId(entity.getAttachedFileId())
                .parentKnowledgeId(entity.getParentKnowledgeId())
                .answerDepth(entity.getAnswerDepth())
                .answerOrder(entity.getAnswerOrder())
                .answerGroupNumber(entity.getAnswerGroupNumber())
                .firstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
