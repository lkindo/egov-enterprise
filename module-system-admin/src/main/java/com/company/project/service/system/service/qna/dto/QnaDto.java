package com.company.project.service.system.service.qna.dto;

import com.company.project.domain.system.service.qna.Qna;
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
public class QnaDto {

    @Schema(description = "Q&A ID")
    private String qaId;

    @Schema(description = "Description")
    private String qestnSj;

    @Schema(description = "Description")
    private String qestnCn;

    @Schema(description = "Description")
    private String writngPassword;

    @Schema(description = "Description")
    private String wrterNm;

    @Schema(description = "Description")
    private String emailAdres;

    @Schema(description = "Description")
    private String emailAnswerAt;

    @Schema(description = "Description")
    private String areaNo;

    @Schema(description = "Description")
    private String middleTelno;

    @Schema(description = "Description")
    private String endTelno;

    @Schema(description = "Description")
    private String qnaProcessSttusCode;

    @Schema(description = "Description")
    private String answerCn;

    @Schema(description = "Description")
    private String answerDe;

    @Schema(description = "Description")
    private Integer inqireCo;

    @Schema(description = "Description")
    private String writngDe;

    @Schema(description = "Description")
    private String frstRegisterId;

    @Schema(description = "Description")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "Description")
    private String lastUpdusrId;

    @Schema(description = "Description")
    private LocalDateTime lastUpdusrPnttm;

    public static QnaDto from(Qna entity) {
        if (entity == null) return null;
        return QnaDto.builder()
                .qaId(entity.getQaId())
                .qestnSj(entity.getQestnSj())
                .qestnCn(entity.getQestnCn())
                .writngPassword(entity.getWritngPassword())
                .wrterNm(entity.getWrterNm())
                .emailAdres(entity.getEmailAdres())
                .emailAnswerAt(entity.getEmailAnswerAt())
                .areaNo(entity.getAreaNo())
                .middleTelno(entity.getMiddleTelno())
                .endTelno(entity.getEndTelno())
                .qnaProcessSttusCode(entity.getQnaProcessSttusCode())
                .answerCn(entity.getAnswerCn())
                .answerDe(entity.getAnswerDe())
                .inqireCo(entity.getInqireCo())
                .writngDe(entity.getWritngDe())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
