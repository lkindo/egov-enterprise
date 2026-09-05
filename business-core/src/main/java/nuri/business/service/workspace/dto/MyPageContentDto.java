package nuri.business.service.workspace.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyPageContentDto {
    private Long contsSn;
    @Size(max = 100)
    private String cntntsNm;
    @Size(max = 255)
    private String cntcUrl;
    @Size(max = 1)
    @Pattern(regexp = "^(?:Y|N)$", message = "사용 여부는 Y 또는 N이어야 합니다.")
    @Schema(allowableValues = {"Y", "N"})
    private String cntntsUseYn;
    @Size(max = 255)
    private String cntntsLinkUrl;
    @Size(max = 255)
    private String cntntsDc;
}
