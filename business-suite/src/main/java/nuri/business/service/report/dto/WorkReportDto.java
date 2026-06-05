package nuri.business.service.report.dto;

import jakarta.validation.constraints.*;
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
    private String rptSeCd;
    @Size(max = 1)
    private String userId;
    @Size(max = 30)
    private String atchFileId;
    @Size(max = 12)
    private String rptSttsCd;
    @Size(max = 8)
    private String rptYmd;
    private String rptTypeCd;

}
