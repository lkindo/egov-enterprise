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
@Schema(description = "공통 분류 코드 정보 DTO")
public class CmmnClCodeDto {

    @Schema(description = "분류코드")
    @Size(max = 12)
    private String clsfCd;

    @Schema(description = "분류코드명")
    @Size(max = 100)
    private String clsfCdNm;

    @Schema(description = "분류코드설명")
    @Size(max = 4000)
    private String clsfCdExpln;

    @Schema(description = "사용여부")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "최초등록자 ID")
    private String frstRgtrId;

    @Schema(description = "최종수정자 ID")
    private String lastMdfrId;

}

