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
    private String reportContent;
    private String reportType;
    private String reportDate;
    private String writerId;
    private String reportStatus;

    public String getReportNm() { return reportSubject; }
    public String getReportCn() { return reportContent; }
    public String getWritngBgnde() { return reportDate; }
    public String getWritngEndde() { return reportDate; }
    public String getSanctnSttus() { return "1".equals(reportStatus) ? "DRAFT" : "APPROVED"; }
}
