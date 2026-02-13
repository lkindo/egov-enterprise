package com.company.project.service.qna.dto;

import com.company.project.domain.qna.Qna;
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
@Schema(description = "Q&A 정보 DTO")
public class QnaDto {

    @Schema(description = "Q&A ID")
    private String qaId;

    @Schema(description = "질문 제목")
    private String qestnSj;

    @Schema(description = "질문 내용")
    private String qestnCn;

    @Schema(description = "작성 비밀번호")
    private String writngPassword;

    @Schema(description = "작성자 이름")
    private String wrterNm;

    @Schema(description = "이메일 주소")
    private String emailAdres;

    @Schema(description = "이메일 답변 여부")
    private String emailAnswerAt;

    @Schema(description = "지역 번호")
    private String areaNo;

    @Schema(description = "중간 전화번호")
    private String middleTelno;

    @Schema(description = "끝 전화번호")
    private String endTelno;

    @Schema(description = "질문 처리 상태 코드")
    private String qnaProcessSttusCode;

    @Schema(description = "답변 내용")
    private String answerCn;

    @Schema(description = "답변 일자")
    private String answerDe;

    @Schema(description = "조회수")
    private Integer inqireCo;

    @Schema(description = "작성 일자")
    private String writngDe;

    @Schema(description = "최초등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초등록시점")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종수정시점")
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
