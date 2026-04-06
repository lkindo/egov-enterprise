package nuri.foundation.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Common Detail Code Info")
public class CmmnDetailCodeDto {

    @Schema(description = "Code ID")
    private String codeId;

    @Schema(description = "Code ID Name")
    private String codeIdNm;

    @Schema(description = "Detail Code")
    private String code;

    @Schema(description = "Detail Code Name")
    private String codeNm;

    @Schema(description = "Detail Code Description")
    private String codeDc;

    @Schema(description = "Use Y/N")
    private String useAt;

    @Schema(description = "First Register ID")
    private String frstRegisterId;

    @Schema(description = "Last Updater ID")
    private String lastUpdusrId;
}
