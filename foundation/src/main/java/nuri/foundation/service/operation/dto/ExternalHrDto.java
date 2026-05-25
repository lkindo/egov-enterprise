package nuri.foundation.service.operation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalHrDto {

    private String evntId;
    private String otsdHrId;
    private String gndrCd;
    private String otsdHrNm;
    private String crTypeCd;
    private String ogdpInstNm;
    private String brdtYmd;
    private String areaNo;
    private String mdTelno;
    private String endTelno;
    private String emlAddr;

    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;
    private LocalDateTime lastUpdtPnttm;
    private String lastUpdusrId;
}
