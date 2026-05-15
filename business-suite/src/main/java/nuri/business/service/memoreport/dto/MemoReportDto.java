package nuri.business.service.memoreport.dto;

import nuri.business.domain.memoreport.MemoReport;
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
@Schema(description = "메모보고 정보")
public class MemoReportDto {

    @Schema(description = "보고아이디")
    private String rptId;

    @Schema(description = "보고제목")
    private String rptTtl;

    @Schema(description = "보고일자")
    private String rptYmd;

    @Schema(description = "작성자아이디")
    private String writerId;

    @Schema(description = "작성자명")
    private String wrterNm;

    @Schema(description = "보고대상자아이디")
    private String rptUserId;

    @Schema(description = "보고대상자명")
    private String reportrNm;

    @Schema(description = "보고내용")
    private String rptCn;

    @Schema(description = "첨부파일아이디")
    private String atchFileId;

    @Schema(description = "지시사항내용")
    private String instrCn;

    @Schema(description = "지시사항등록일시")
    private String instrRegDt;

    @Schema(description = "보고대상자조회일시")
    private String rptInqDt;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    public String getFrstRegisterId() {
        return writerId;
    }

    public String getReprtDe() { return rptYmd; }
    public String getReprtCn() { return rptCn; }
    public String getRecptnId() { return rptUserId; }
    public String getRecptnNm() { return reportrNm; }
    public String getReadAt() { return rptInqDt; }

    public LocalDateTime getFrstRegistPnttm() {
        return createdDate;
    }

    public static MemoReportDto from(MemoReport entity) {
        if (entity == null) return null;
        return MemoReportDto.builder()
                .rptId(entity.getRptId())
                .rptTtl(entity.getRptTtl())
                .rptYmd(entity.getRptYmd())
                .writerId(entity.getWriterId())
                .rptUserId(entity.getRptUserId())
                .rptCn(entity.getRptCn())
                .atchFileId(entity.getAtchFileId())
                .instrCn(entity.getInstrCn())
                .instrRegDt(entity.getInstrRegDt())
                .rptInqDt(entity.getRptInqDt())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
