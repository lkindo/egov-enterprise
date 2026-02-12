package com.company.project.service.faq.dto;

import com.company.project.domain.faq.Faq;
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
@Schema(description = "FAQ 정보 DTO")
public class FaqDto {

    @Schema(description = "FAQ ID")
    private String faqId;

    @Schema(description = "질문 제목")
    private String qestnSj;

    @Schema(description = "질문 내용")
    private String qestnCn;

    @Schema(description = "답변 내용")
    private String answerCn;

    @Schema(description = "조회수")
    private Integer inqireCo;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static FaqDto from(Faq entity) {
        if (entity == null) return null;
        return FaqDto.builder()
                .faqId(entity.getFaqId())
                .qestnSj(entity.getQestnSj())
                .qestnCn(entity.getQestnCn())
                .answerCn(entity.getAnswerCn())
                .inqireCo(entity.getInqireCo())
                .atchFileId(entity.getAtchFileId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
