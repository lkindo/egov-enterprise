package com.company.project.service.batch.dto;

import com.company.project.domain.batch.BatchOpert;
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
public class BatchOpertDto {

    @Schema(description = "Description")
    private String batchOpertId;

    @Schema(description = "Description")
    private String batchOpertNm;

    @Schema(description = "Description")
    private String batchProgrm;

    @Schema(description = "Description")
    private String paramtr;

    @Schema(description = "Description")
    private String useAt;

    @Schema(description = "Description")
    private LocalDateTime frstRegisterPnttm;

    public static BatchOpertDto from(BatchOpert entity) {
        if (entity == null) return null;
        return BatchOpertDto.builder()
                .batchOpertId(entity.getBatchOpertId())
                .batchOpertNm(entity.getBatchOpertNm())
                .batchProgrm(entity.getBatchProgrm())
                .paramtr(entity.getParamtr())
                .useAt(entity.getUseAt())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
