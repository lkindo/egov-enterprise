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

    @Schema(description = "최초등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초등록시점")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종수정시점")
    private LocalDateTime lastUpdusrPnttm;

    public static FaqDto from(Faq entity) {
        if (entity == null) return null;
        return FaqDto.builder()
                .faqId(entity.getFaqId())
                .qestnSj(entity.getQestnSj())
                .qestnCn(entity.getQestnCn())
                .answerCn(entity.getAnswerCn())
                .inqireCo(entity.getInqireCo())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
