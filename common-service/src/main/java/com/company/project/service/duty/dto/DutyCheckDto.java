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
@Schema(description = "당직 체크 항목 DTO")
public class DutyCheckDto {

    @Schema(description = "당직 체크 구분")
    private String bndtCeckSe;

    @Schema(description = "당직 체크 코드")
    private String bndtCeckCd;

    @Schema(description = "당직 체크 코드 명")
    private String bndtCeckCdNm;

    @Schema(description = "사용 여부")
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
