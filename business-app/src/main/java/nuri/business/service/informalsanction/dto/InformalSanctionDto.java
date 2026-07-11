package nuri.business.service.informalsanction.dto;

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
@Schema(description = "비정형 결재 DTO (표준화)")
public class InformalSanctionDto {

    @Schema(description = "비정형 결재 ID")
    @Size(max = 20)
    private String ifmlAtrzId;

    @Schema(description = "업무 구분 코드")
    @Size(max = 12)
    @NotBlank
    private String taskSeCd;

    @Schema(description = "업무 구분 명")
    private String taskSeNm;

    @Schema(description = "신청자 ID")
    @Size(max = 20)
    @NotBlank
    private String aplcntId;

    @Schema(description = "신청자 명")
    private String aplcntNm;

    @Schema(description = "신청 일자")
    @Size(max = 8)
    private String reqYmd;

    @Schema(description = "결재자 ID")
    @Size(max = 20)
    @NotBlank
    private String aprvrId;

    @Schema(description = "결재자 명")
    private String aprvrNm;

    @Schema(description = "결재자 조직 명")
    private String aprvrOrgnztNm;

    @Schema(description = "승인 여부")
    @Size(max = 1)
    private String aprvYn;

    @Schema(description = "결재 일시")
    private LocalDateTime atrzDt;

    @Schema(description = "반려 사유")
    @Size(max = 4000)
    private String rjctRsnCn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}

