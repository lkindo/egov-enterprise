package com.company.project.service.duty.dto;

import com.company.project.domain.duty.BndtDiary;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class DutyDiaryDto {

    @Schema(description = "Description")
    private String bndtId;

    @Schema(description = "Description")
    private String bndtDe;

    @Schema(description = "Description")
    private String bndtCeckSe;

    @Schema(description = "Description")
    private String bndtCeckCd;

    @Schema(description = "Description")
    private String bndtCeckCdNm;

    @Schema(description = "Description")
    private String chckSttus;

    public static DutyDiaryDto from(BndtDiary entity) {
        if (entity == null) return null;
        return DutyDiaryDto.builder()
                .bndtId(entity.getBndtId())
                .bndtDe(entity.getBndtDe())
                .bndtCeckSe(entity.getBndtCeckSe())
                .bndtCeckCd(entity.getBndtCeckCd())
                .chckSttus(entity.getChckSttus())
                .build();
    }
}
