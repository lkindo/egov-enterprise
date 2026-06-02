package nuri.business.service.code.dto;

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
@Schema(description = "행정코드 정보 DTO")
public class AdministCodeDto {
    @Schema(description = "행정구역코드")
    @Size(max = 12)
    private String admdstCd;

    @Schema(description = "행정구역구분")
    @Size(max = 12)
    private String admdstSeCd;

    @Schema(description = "행정구역명")
    @Size(max = 100)
    private String admdstZoneNm;

    @Schema(description = "상위행정구역코드")
    @Size(max = 12)
    private String upAdmdstCd;

    @Schema(description = "사용여부")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "생성일자")
    @Size(max = 8)
    private String crtYmd;

    @Schema(description = "폐지일자")
    @Size(max = 8)
    private String ablYmd;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;

    @Schema(description = "생성일시")
    private LocalDateTime crtDt;

    @Schema(description = "수정자 ID")
    private String lastMdfrId;

    @Schema(description = "수정일시")
    private LocalDateTime mdfcnDt;

}
