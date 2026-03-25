package com.company.project.business.service.help.dto;

import com.company.project.business.domain.help.OnlineManual;
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
public class OnlineManualDto {

    @Schema(description = "Description")
    private String onlineMnlId;

    @Schema(description = "Description")
    private String onlineMnlNm;

    @Schema(description = "Description")
    private String onlineMnlSeCode;

    @Schema(description = "Description")
    private String onlineMnlDf;

    @Schema(description = "Description")
    private String onlineMnlDc;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static OnlineManualDto from(OnlineManual entity) {
        if (entity == null) return null;
        return OnlineManualDto.builder()
                .onlineMnlId(entity.getOnlineMnlId())
                .onlineMnlNm(entity.getOnlineMnlNm())
                .onlineMnlSeCode(entity.getOnlineMnlSeCode())
                .onlineMnlDf(entity.getOnlineMnlDf())
                .onlineMnlDc(entity.getOnlineMnlDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
