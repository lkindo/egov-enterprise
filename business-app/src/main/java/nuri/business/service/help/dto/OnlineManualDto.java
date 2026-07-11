package nuri.business.service.help.dto;

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
@Schema(description = "온라인 메뉴얼 DTO")
public class OnlineManualDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "온라인 메뉴얼 ID")
    private String onlnMnlId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "온라인 메뉴얼 명")
    private String onlnMnlNm;

    @NotBlank
    @Size(max = 12)
    @Schema(description = "온라인 메뉴얼 구분코드")
    private String onlnMnlSeCd;

    @Size(max = 1000)
    @Schema(description = "온라인 메뉴얼 정의")
    private String onlnMnlDfn;

    @Size(max = 4000)
    @Schema(description = "온라인 메뉴얼 설명")
    private String onlnMnlExpln;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    // 엔티티→DTO 매핑은 OnlineManualMapper(MapStruct) 로 이관 (프레임워크 표준). 수기 from() 폐지.
}
