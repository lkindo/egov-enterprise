package nuri.business.service.board.dto;

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
public class BoardMasterDto {

    @Size(max = 20)
    private String bbsId;
    @Size(max = 100)
    @NotBlank
    private String bbsTtl;
    @Size(max = 4000)
    private String bbsExpln;
    @Size(max = 12)
    @NotBlank
    private String bbsTypeCd;
    private String bbsTypeCdNm; // 조인 컬럼명 표준화
    @Size(max = 12)
    @NotBlank
    private String bbsAtrbCd;
    private String bbsAtrbCdNm; // 조인 컬럼명 표준화
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansPsbltyYn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    @NotNull
    private Long atchPsbltyFileSz;
    @Size(max = 20)
    private String tmpltId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private Long cmntySn;
    private Long blogSn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String blogYn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansYn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String stsfdgYn;

    // Additional fields for completeness
    private String authFlag;
    private String tmplatCours;
}
