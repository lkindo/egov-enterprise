package nuri.foundation.service.menu.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "메뉴 생성 DTO")
public class MenuCreateDto {
    /** 메뉴번호 */
    @Schema(description = "메뉴 번호")
    private Long menuSn;
    
    /** 맵생성ID */
    @Schema(description = "맵 생성 ID")
    @Size(max = 20)
    private String mapngCrtId;
    
    /** 권한코드 */
    @Schema(description = "권한 코드")
    @Size(max = 12)
    private String authrtCd;

    /** 권한명 */
    @Schema(description = "권한명")
    @Size(max = 300)
    @NotBlank
    private String authrtNm;

    /** 권한설명 */
    @Schema(description = "권한 설명")
    @Size(max = 4000)
    private String authrtExpln;

    /** 권한생성일 */
    @Schema(description = "권한 생성일")
    private String authrtCrtYmd;

    /** 생성자ID */
    @Schema(description = "생성자 ID")
    @Size(max = 20)
    private String crtrId;

    /** 메뉴생성여부 (1 이상: 생성됨, 0: 미생성) */
    @Schema(description = "메뉴 생성 여부 (1 이상: 생성됨, 0: 미생성)")
    private int chkYeoBu;
}
