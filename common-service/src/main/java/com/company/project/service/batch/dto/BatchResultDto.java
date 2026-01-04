package com.company.project.service.batch.dto;

import com.company.project.domain.batch.BatchResult;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 배치결과 DTO
 */
@Getter
@Builder
public class BatchResultDto {
    private String batchResultId;
    private String batchSchdulId;
    private String batchOpertId;
    private String paramtr;
    private String sttus;
    private String executBeginTime;
    private String executEndTime;
    private String errorInfo;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static BatchResultDto from(BatchResult entity) {
        return BatchResultDto.builder()
                .batchResultId(entity.getBatchResultId())
                .batchSchdulId(entity.getBatchSchdulId())
                .batchOpertId(entity.getBatchOpertId())
                .paramtr(entity.getParamtr())
                .sttus(entity.getSttus())
                .executBeginTime(entity.getExecutBeginTime())
                .executEndTime(entity.getExecutEndTime())
                .errorInfo(entity.getErrorInfo())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
