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

    @NotNull
    @Positive
    private Long evntSn;
    @NotBlank
    @Size(max = 20)
    private String otsdHrId;
    // [2026-09-05] 물리 컬럼 length=12 와 정합(InputContractMirrorLinter 표적 편입).
    @Size(max = 12)
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
    // [2026-09-05] 물리 컬럼 length=320 와 정합. 종전 50 은 컬럼보다 좁은 임의 제한이었다.
    @Size(max = 320)
    private String emlAddr;

    private LocalDateTime crtDt;
    private String frstRgtrId;
    private LocalDateTime mdfcnDt;
    private String lastMdfrId;
}
