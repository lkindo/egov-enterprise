package com.company.project.service.batch.dto;

import com.company.project.domain.batch.BatchJob;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 배치작업 DTO
 */
@Getter
@Builder
public class BatchJobDto {
    private String batchOpertId;
    private String batchOpertNm;
    private String batchProgrm;
    private String paramtr;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static BatchJobDto from(BatchJob entity) {
        return BatchJobDto.builder()
                .batchOpertId(entity.getBatchOpertId())
                .batchOpertNm(entity.getBatchOpertNm())
                .batchProgrm(entity.getBatchProgrm())
                .paramtr(entity.getParamtr())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
