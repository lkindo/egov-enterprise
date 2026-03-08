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
@Schema(description = "Description")
public class DutyDto {

    @Schema(description = "Description")
    private String bndtId;

    @Schema(description = "Description")
    private String bndtNm;

    @Schema(description = "Description")
    private String bndtDe;

    @Schema(description = "Description")
    private String remark;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public String getFrstRegisterId() {
        return createdBy;
    }

    public LocalDateTime getFrstRegistPnttm() {
        return createdDate;
    }

    @Schema(description = "Description")
    private List<DutyDiaryDto> diaries;

    public static DutyDto from(BndtManage entity) {
        if (entity == null) return null;
        return DutyDto.builder()
                .bndtId(entity.getBndtId())
                .bndtDe(entity.getBndtDe())
                .remark(entity.getRemark())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
