package nuri.business.service.operation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
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
    @Size(max = 50)
    private String emlAddr;

    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String frstRgtrId;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime mdfcnDt;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMdfrId;
}
