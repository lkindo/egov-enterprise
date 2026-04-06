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
@Schema(description = "Description")
public class FaqDto {

    @Schema(description = "FAQ ID")
    private String faqId;

    @Schema(description = "Description")
    private String qestnSj;

    @Schema(description = "Description")
    private String qestnCn;

    @Schema(description = "Description")
    private String answerCn;

    @Schema(description = "Description")
    private Integer inqireCo;

    @Schema(description = "Description")
    private String atchFileId;

    @Schema(description = "Description")
    private String frstRegisterId;

    @Schema(description = "Description")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "Description")
    private String lastUpdusrId;

    @Schema(description = "Description")
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
