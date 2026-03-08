package com.company.project.service.help.dto;

import com.company.project.domain.help.Hpcm;
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

    @Schema(description = "Description")
    private String hpcmId;

    @Schema(description = "Description")
    private String hpcmSeCode;

    @Schema(description = "Description")
    private String hpcmDf;

    @Schema(description = "Description")
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
