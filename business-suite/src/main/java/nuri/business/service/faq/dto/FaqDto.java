package nuri.business.service.faq.dto;

import nuri.business.domain.faq.Faq;
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
@Schema(description = "FAQ 정보")
public class FaqDto {

    @Schema(description = "FAQ ID")
    private String faqId;

    @Schema(description = "질문제목")
    private String qestnTtl;

    @Schema(description = "질문내용")
    private String qestnCn;

    @Schema(description = "답변내용")
    private String answerCn;

    @Schema(description = "조회수")
    private Integer inqireCo;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "등록자 ID")
    private String frstRegisterId;

    @Schema(description = "등록일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "수정일시")
    private LocalDateTime lastUpdusrPnttm;

    // legacy
    public String getQestnSj() { return qestnTtl; }
    public void setQestnSj(String v) { this.qestnTtl = v; }

    public LocalDateTime getFrstRegistPnttm() {
        return frstRegisterPnttm;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return lastUpdusrPnttm;
    }

    public static FaqDto from(Faq entity) {
        if (entity == null) return null;
        return FaqDto.builder()
                .faqId(entity.getFaqId())
                .qestnTtl(entity.getQestnTtl())
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
