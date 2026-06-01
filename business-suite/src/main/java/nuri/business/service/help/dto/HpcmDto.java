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
    private String hpcmId;

    @NotBlank
    @Size(max = 3)
    @Schema(description = "도움말 구분코드")
    private String hpcmSeCode;

    @NotBlank
    @Size(max = 1000)
    @Schema(description = "도움말 정의")
    private String hpcmDf;

    @NotBlank
    @Size(max = 65535)
    @Schema(description = "도움말 설명")
    private String hpcmDc;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static HpcmDto from(Hpcm entity) {
        if (entity == null) return null;
        return HpcmDto.builder()
                .hpcmId(entity.getHpcmId())
                .hpcmSeCode(entity.getHpcmSeCode())
                .hpcmDf(entity.getHpcmDf())
                .hpcmDc(entity.getHpcmDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
