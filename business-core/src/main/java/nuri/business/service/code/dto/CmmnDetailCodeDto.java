package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

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
@Schema(description = "공통 상세 코드 정보 DTO")
public class CmmnDetailCodeDto {

    @Schema(description = "코드 ID")
    @Size(max = 20)
    private String cdId;

    @Schema(description = "코드 ID명")
    @Size(max = 100)
    private String cdIdNm;

    @Schema(description = "상세코드")
    @Size(max = 12)
    private String dtlCd;

    @Schema(description = "상세코드명")
    @Size(max = 100)
    private String dtlCdNm;

    @Schema(description = "상세코드설명")
    @Size(max = 4000)
    private String dtlCdExpln;

    @Schema(description = "사용여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @NotBlank
    @Pattern(regexp = "^(?:Y|N)$")
    private String useYn;

    @Schema(description = "최초등록자 ID")
    private String frstRgtrId;

    @Schema(description = "최종수정자 ID")
    private String lastMdfrId;

}

