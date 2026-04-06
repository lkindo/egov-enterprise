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
@Schema(description = "Common Code DTO")
public class CmmnCodeDto {

    @Schema(description = "Code ID")
    private String codeId;

    @Schema(description = "Code ID Name")
    private String codeIdNm;

    @Schema(description = "Code ID Description")
    private String codeIdDc;

    @Schema(description = "Classification Code")
    private String clCode;

    @Schema(description = "Classification Code Name")
    private String clCodeNm;

    @Schema(description = "Use Y/N")
    private String useAt;

    @Schema(description = "First Register ID")
    private String frstRegisterId;

    @Schema(description = "Last Updater ID")
    private String lastUpdusrId;
}
