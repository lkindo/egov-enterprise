package nuri.business.service.usermanagement.dto;

import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "부서 정보 DTO")
public class DeptManageDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "부서 ID")
    private String ognzId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "부서 명")
    private String ognzNm;

    @Size(max = 4000)
    @Schema(description = "부서 설명")
    private String ognzExpln;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}
