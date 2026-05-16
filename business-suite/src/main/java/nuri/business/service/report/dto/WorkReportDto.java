package nuri.business.service.report.dto;

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
    private String wrterId;
    private String atchFileId;
    private String rptSttsCd;
    private String rptYmd;
    private String rptTypeCd;

    // standard aliases
    public String getReprtId() { return reportId; }
    public String getReprtTtl() { return reportSubject; }
    public String getReprtCn() { return reportContents; }
    
    public void setReprtId(String id) { this.reportId = id; }
    public void setReprtTtl(String subject) { this.reportSubject = subject; }
}
