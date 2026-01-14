package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 배치결과 JPA Entity
 * 레거시 테이블: COMTNBATCHRESULT
 */
@Entity
@Table(name = "NBATCHRESULT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BatchResult {

    @Id
    @Column(name = "BATCH_RESULT_ID", length = 20)
    private String batchResultId;

    @Column(name = "BATCH_SCHDUL_ID", length = 20)
    private String batchSchdulId;

    @Column(name = "BATCH_OPERT_ID", length = 20)
    private String batchOpertId;

    @Column(name = "PARAMTR", length = 250)
    private String paramtr;

    @Column(name = "STTUS", length = 20)
    private String sttus;

    @Column(name = "EXECUT_BEGIN_TIME", length = 14)
    private String executBeginTime;

    @Column(name = "EXECUT_END_TIME", length = 14)
    private String executEndTime;

    @Column(name = "ERROR_INFO", length = 2000)
    private String errorInfo;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BatchResult(String batchResultId, String batchSchdulId, String batchOpertId,
            String paramtr, String sttus, String executBeginTime, String executEndTime,
            String errorInfo, String frstRegisterId) {
        this.batchResultId = batchResultId;
        this.batchSchdulId = batchSchdulId;
        this.batchOpertId = batchOpertId;
        this.paramtr = paramtr;
        this.sttus = sttus;
        this.executBeginTime = executBeginTime;
        this.executEndTime = executEndTime;
        this.errorInfo = errorInfo;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
