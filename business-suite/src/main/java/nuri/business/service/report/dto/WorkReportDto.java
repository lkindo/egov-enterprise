package nuri.business.service.report.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkReportDto {
    private String rptId;
    private String rptTtl;
    private String rptCn;
    private String rptTypeCd;
    private String rptYmd;
    private String writerId;
    private String rptSttsCd;

    // Aliases for legacy compatibility
    public String getReportNm() {
        return rptTtl;
    }

    public String getReportCn() {
        return rptCn;
    }

    public String getWritngBgnde() {
        return rptYmd;
    }

    public String getWritngEndde() {
        return rptYmd;
    }

    public String getSanctnSttus() {
        return "1".equals(rptSttsCd) ? "DRAFT" : "APPROVED";
    }
}
