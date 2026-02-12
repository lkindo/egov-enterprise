package com.company.project.service.duty.dto;

import com.company.project.domain.duty.BndtManage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "당직 정보 DTO")
public class DutyDto {

    @Schema(description = "당직자 ID")
    private String bndtId;

    @Schema(description = "당직자 명")
    private String bndtNm;

    @Schema(description = "당직 일자")
    private String bndtDe;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "당직 일지 목록")
    private List<DutyDiaryDto> diaries;

    public static DutyDto from(BndtManage entity) {
        if (entity == null) return null;
        return DutyDto.builder()
                .bndtId(entity.getBndtId())
                .bndtDe(entity.getBndtDe())
                .remark(entity.getRemark())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
