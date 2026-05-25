package nuri.foundation.service.code.dto;
 
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
    private String admdstCd;

    @Schema(description = "행정구역구분")
    private String admdstSeCd;

    @Schema(description = "행정구역명")
    private String admdstZoneNm;

    @Schema(description = "상위행정구역코드")
    private String upAdmdstCd;

    @Schema(description = "사용여부")
    private String useYn;

    @Schema(description = "생성일자")
    private String crtYmd;

    @Schema(description = "폐지일자")
    private String ablYmd;

    @Schema(description = "생성자 ID")
    private String createdBy;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    @Schema(description = "수정자 ID")
    private String lastModifiedBy;

    @Schema(description = "수정일시")
    private LocalDateTime lastModifiedDate;

}
