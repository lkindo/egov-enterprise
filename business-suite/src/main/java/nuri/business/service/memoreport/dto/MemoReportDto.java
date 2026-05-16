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
    private String reportId;

    @Schema(description = "보고제목")
    private String reportSubject;

    @Schema(description = "보고일자")
    private String reprtDe;

    @Schema(description = "작성자아이디")
    private String writerId;

    @Schema(description = "작성자명")
    private String wrterNm;

    @Schema(description = "보고대상자아이디")
    private String reportrId;

    @Schema(description = "보고대상자명")
    private String reportrNm;

    @Schema(description = "보고내용")
    private String reportContents;

    @Schema(description = "첨부파일아이디")
    private String atchFileId;

    @Schema(description = "지시사항내용")
    private String instrCn;

    @Schema(description = "지시사항등록일시")
    private String instrRegDt;

    @Schema(description = "보고대상자조회일시")
    private String reportrInqireDt;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    public String getFrstRegisterId() {
        return writerId;
    }

    // standard
    public String getReprtId() { return reportId; }
    public String getReprtTtl() { return reportSubject; }
    public String getReprtCn() { return reportContents; }

    // legacy
    public String getRptId() { return reportId; }
    public String getRptTtl() { return reportSubject; }
    public String getRptYmd() { return reprtDe; }
    public String getRptCn() { return reportContents; }
    public String getRptUserId() { return reportrId; }
    public String getRptInqDt() { return reportrInqireDt; }
    
    public static MemoReportDto from(MemoReport entity) {
        if (entity == null) return null;
        return MemoReportDto.builder()
                .reportId(entity.getReportId())
                .reportSubject(entity.getReportSubject())
                .reprtDe(entity.getReprtDe()) 
                .writerId(entity.getWriterId())
                .reportrId(entity.getReportrId())
                .reportContents(entity.getReportContents())
                .atchFileId(entity.getAtchFileId())
                .instrCn(entity.getInstrCn())
                .instrRegDt(entity.getInstrRegDt())
                .reportrInqireDt(entity.getReportrInqireDt())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
