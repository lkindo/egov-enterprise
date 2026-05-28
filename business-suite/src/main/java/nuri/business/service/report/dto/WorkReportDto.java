package nuri.business.service.report.dto;

import jakarta.validation.constraints.*;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkReportDto {
    private String reportId;
    private String reportSubject;
    private String reportContents;
    private String reprtSe;
    @Size(max = 1)
    private String wrterId;
    @Size(max = 30)
    private String atchFileId;
    @Size(max = 12)
    private String rptSttsCd;
    @Size(max = 8)
    private String rptYmd;
    private String rptTypeCd;

    // standard aliases
    public String getReprtId() { return reportId; }
    public String getReprtTtl() { return reportSubject; }
    public String getReprtCn() { return reportContents; }
    
    public void setReprtId(String id) { this.reportId = id; }
    public void setReprtTtl(String subject) { this.reportSubject = subject; }
}
