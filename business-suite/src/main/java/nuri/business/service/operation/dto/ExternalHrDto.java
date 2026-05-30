package nuri.business.service.operation.dto;

import jakarta.validation.constraints.*;

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

    @Size(max = 20)
    private String evntId;
    @Size(max = 20)
    private String otsdHrId;
    @Size(max = 30)
    private String gndrCd;
    @Size(max = 100)
    private String otsdHrNm;
    @Size(max = 12)
    private String crTypeCd;
    @Size(max = 100)
    private String ogdpInstNm;
    @Size(max = 8)
    private String brdtYmd;
    @Size(max = 4)
    private String areaNo;
    @Size(max = 4)
    private String mdTelno;
    @Size(max = 4)
    private String endTelno;
    @Size(max = 50)
    private String emlAddr;

    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;
    private LocalDateTime lastUpdtPnttm;
    private String lastUpdusrId;
}
