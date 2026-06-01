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
    private String frstRegisterId;

    @Schema(description = "등록일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "수정일시")
    private LocalDateTime lastUpdusrPnttm;

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
                .frstRegisterId(entity.getFrstRgtrId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastMdfrId())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
