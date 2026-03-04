package com.company.project.service.duty.dto;

import com.company.project.domain.duty.BndtCeckManage;
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
public class DutyCheckDto {

    @Schema(description = "Description")
    private String bndtCeckSe;

    @Schema(description = "Description")
    private String bndtCeckCd;

    @Schema(description = "Description")
    private String bndtCeckCdNm;

    @Schema(description = "Description")
    private String useAt;

    public static DutyCheckDto from(BndtCeckManage entity) {
        if (entity == null) return null;
        return DutyCheckDto.builder()
                .bndtCeckSe(entity.getBndtCeckSe())
                .bndtCeckCd(entity.getBndtCeckCd())
                .bndtCeckCdNm(entity.getBndtCeckCdNm())
                .useAt(entity.getUseAt())
                .build();
    }
}