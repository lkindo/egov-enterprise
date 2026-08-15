package nuri.business.service.report.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkReportDto {
    private Long rptpSn;
    private String rptTtl;
    private String rptCn;
    private String rptSeCd;
    @Size(max = 1)
    private String userId;
    private Long atchFileSn;
    @Size(max = 12)
    private String rptSttsCd;
    @Size(max = 8)
    private String rptYmd;
    private String rptTypeCd;

}
