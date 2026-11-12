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

    @Schema(description = "온라인 메뉴얼 일련번호", example = "1")
    private Long onlnMnlSn;

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

    @Schema(description = "낙관적 잠금 버전(V2_149). 조회한 값을 수정 요청에 그대로 돌려보내며 수정할 때 필수다 — 다르면 409. 등록에서는 무시한다.")
    @Min(0)
    private Integer version;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    // 엔티티→DTO 매핑은 OnlineManualMapper(MapStruct) 로 이관 (프레임워크 표준). 수기 from() 폐지.
}
