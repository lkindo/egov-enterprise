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
@Schema(description = "배치작업 정보 DTO")
public class BatchOpertDto {

    @Schema(description = "배치작업 ID")
    private String batchOpertId;

    @Schema(description = "배치작업 명")
    private String batchOpertNm;

    @Schema(description = "배치프로그램")
    private String batchProgrm;

    @Schema(description = "파라미터")
    private String paramtr;

    @Schema(description = "사용여부")
    private String useAt;

    @Schema(description = "등록일시")
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
