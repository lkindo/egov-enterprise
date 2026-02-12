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
@Schema(description = "당직 일지 DTO")
public class DutyDiaryDto {

    @Schema(description = "당직자 ID")
    private String bndtId;

    @Schema(description = "당직 일자")
    private String bndtDe;

    @Schema(description = "당직 체크 구분")
    private String bndtCeckSe;

    @Schema(description = "당직 체크 코드")
    private String bndtCeckCd;

    @Schema(description = "당직 체크 코드 명")
    private String bndtCeckCdNm;

    @Schema(description = "체크 상태")
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
