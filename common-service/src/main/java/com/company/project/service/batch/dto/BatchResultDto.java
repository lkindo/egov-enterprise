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
    private String batchOpertNm;
    private String batchProgrm;
    private String paramtr;
    private String sttus;
    private String sttusNm;
    private String errorInfo;
    private String executBeginTime;
    private String executEndTime;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static BatchResultDto from(BatchResult entity, String batchOpertNm, String batchProgrm, String sttusNm) {
        if (entity == null) {
            return null;
        }

        return BatchResultDto.builder()
                .batchResultId(entity.getBatchResultId())
                .batchSchdulId(entity.getBatchSchdulId())
                .batchOpertId(entity.getBatchOpertId())
                .batchOpertNm(batchOpertNm)
                .batchProgrm(batchProgrm)
                .paramtr(entity.getParamtr())
                .sttus(entity.getSttus())
                .sttusNm(sttusNm)
                .errorInfo(entity.getErrorInfo())
                .executBeginTime(entity.getExecutBeginTime())
                .executEndTime(entity.getExecutEndTime())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
