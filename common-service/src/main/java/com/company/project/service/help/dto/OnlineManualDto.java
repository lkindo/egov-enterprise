package com.company.project.service.help.dto;

import com.company.project.domain.help.OnlineManual;
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
@Schema(description = "온라인매뉴얼 정보 DTO")
public class OnlineManualDto {

    @Schema(description = "매뉴얼 ID")
    private String onlineMnlId;

    @Schema(description = "매뉴얼 명")
    private String onlineMnlNm;

    @Schema(description = "매뉴얼 구분 코드")
    private String onlineMnlSeCode;

    @Schema(description = "매뉴얼 정의")
    private String onlineMnlDf;

    @Schema(description = "매뉴얼 설명")
    private String onlineMnlDc;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
