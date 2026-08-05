package nuri.business.service.menu.dto;

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
    @Schema(description = "메뉴 번호")
    private Long menuSn;
    
    @Schema(description = "맵 생성 ID")
    @Size(max = 20)
    private String mapngCrtId;
    
    @Schema(description = "권한 코드")
    @Size(max = 12)
    private String authrtCd;

    @Schema(description = "권한명")
    @Size(max = 300)
    @NotBlank
    private String authrtNm;

    @Schema(description = "권한 설명")
    @Size(max = 4000)
    private String authrtExpln;

    @Schema(description = "권한 생성일")
    private String authrtCrtYmd;

    @Schema(description = "생성자 ID")
    @Size(max = 20)
    private String crtrId;

    @Schema(description = "메뉴 생성 여부 (1 이상: 생성됨, 0: 미생성)")
    private int chkYeoBu;
}
