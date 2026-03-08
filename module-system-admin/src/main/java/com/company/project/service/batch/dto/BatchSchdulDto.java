package com.company.project.service.batch.dto;

import com.company.project.domain.batch.BatchSchdul;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 諛곗?????DTO
 */
@Getter
@Builder
public class BatchSchdulDto {
    private String batchSchdulId;
    private String batchOpertId;
    private String executCycle;
    private String executSchdulDe;
    private String executSchdulHour;
    private String executSchdulMnt;
    private String executSchdulSecnd;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    // Display fields
    private String batchOpertNm;
    private String batchProgrm;
    private String executCycleNm;
    private String executSchdul;
    private java.util.List<String> executSchdulDfkSes;

    public static BatchSchdulDto from(BatchSchdul entity) {
        return BatchSchdulDto.builder()
                .batchSchdulId(entity.getBatchSchdulId())
                .batchOpertId(entity.getBatchOpertId())
                .executCycle(entity.getExecutCycle())
                .executSchdulDe(entity.getExecutSchdulDe())
                .executSchdulHour(entity.getExecutSchdulHour())
                .executSchdulMnt(entity.getExecutSchdulMnt())
                .executSchdulSecnd(entity.getExecutSchdulSecnd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegistPnttm())
                .build();
    }

    public static BatchSchdulDto from(BatchSchdul entity, String batchOpertNm, String batchProgrm, String executCycleNm,
            String executSchdul, java.util.List<String> executSchdulDfkSes) {
        return BatchSchdulDto.builder()
                .batchSchdulId(entity.getBatchSchdulId())
                .batchOpertId(entity.getBatchOpertId())
                .executCycle(entity.getExecutCycle())
                .executSchdulDe(entity.getExecutSchdulDe())
                .executSchdulHour(entity.getExecutSchdulHour())
                .executSchdulMnt(entity.getExecutSchdulMnt())
                .executSchdulSecnd(entity.getExecutSchdulSecnd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegistPnttm())
                .batchOpertNm(batchOpertNm)
                .batchProgrm(batchProgrm)
                .executCycleNm(executCycleNm)
                .executSchdul(executSchdul)
                .executSchdulDfkSes(executSchdulDfkSes)
                .build();
    }
}
