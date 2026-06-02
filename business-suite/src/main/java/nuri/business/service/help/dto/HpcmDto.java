package nuri.business.service.help.dto;

import jakarta.validation.constraints.*;
import nuri.business.domain.help.Hpcm;
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
@Schema(description = "Description")
public class HpcmDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "도움말 ID")
    private String hlpId;

    @NotBlank
    @Size(max = 3)
    @Schema(description = "도움말 구분코드")
    private String hlpSeCd;

    @NotBlank
    @Size(max = 1000)
    @Schema(description = "도움말 정의")
    private String hlpDfn;

    @NotBlank
    @Size(max = 65535)
    @Schema(description = "도움말 설명")
    private String hlpExpln;

    @Schema(description = "Description")
    private String frstRgtrId;

    @Schema(description = "Description")
    private LocalDateTime crtDt;

    public static HpcmDto from(Hpcm entity) {
        if (entity == null) return null;
        return HpcmDto.builder()
                .hlpId(entity.getHlpId())
                .hlpSeCd(entity.getHlpSeCd())
                .hlpDfn(entity.getHlpDfn())
                .hlpExpln(entity.getHlpExpln())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
