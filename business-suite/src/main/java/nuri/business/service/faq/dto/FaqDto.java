package nuri.business.service.faq.dto;

import jakarta.validation.constraints.*;

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
    @Size(max = 20)
    private String faqId;

    @Schema(description = "질문제목")
    private String qstnTtl;

    @Schema(description = "질문내용")
    private String qstnCn;

    @Schema(description = "답변내용")
    private String ansCn;

    @Schema(description = "조회수")
    private Integer inqCnt;

    @Schema(description = "첨부파일 ID")
    @Size(max = 30)
    private String atchFileId;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록일시")
    private LocalDateTime crtDt;

    @Schema(description = "수정자 ID")
    private String lastMdfrId;

    @Schema(description = "수정일시")
    private LocalDateTime mdfcnDt;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    public static FaqDto from(Faq entity) {
        if (entity == null) return null;
        return FaqDto.builder()
                .faqId(entity.getFaqId())
                .qstnTtl(entity.getQstnTtl())
                .qstnCn(entity.getQstnCn())
                .ansCn(entity.getAnsCn())
                .inqCnt(entity.getInqCnt())
                .atchFileId(entity.getAtchFileId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }
}
