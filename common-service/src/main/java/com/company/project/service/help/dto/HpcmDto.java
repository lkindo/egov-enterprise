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
@Schema(description = "도움말 정보 DTO")
public class HpcmDto {

    @Schema(description = "도움말 ID")
    private String hpcmId;

    @Schema(description = "도움말 구분 코드")
    private String hpcmSeCode;

    @Schema(description = "도움말 정의")
    private String hpcmDf;

    @Schema(description = "도움말 설명")
    private String hpcmDc;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
