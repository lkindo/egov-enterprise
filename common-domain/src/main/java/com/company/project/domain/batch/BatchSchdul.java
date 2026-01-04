package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 배치스케줄 JPA Entity
 * 레거시 테이블: COMTNBATCHSCHDUL
 */
@Entity
@Table(name = "COMTNBATCHSCHDUL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BatchSchdul {

    @Id
    @Column(name = "BATCH_SCHDUL_ID", length = 20)
    private String batchSchdulId;

    @Column(name = "BATCH_OPERT_ID", length = 20)
    private String batchOpertId;

    @Column(name = "EXECUT_CYCLE", length = 2)
    private String executCycle;

    @Column(name = "EXECUT_SCHDUL_DE", length = 20)
    private String executSchdulDe;

    @Column(name = "EXECUT_SCHDUL_HOUR", length = 2)
    private String executSchdulHour;

    @Column(name = "EXECUT_SCHDUL_MNT", length = 2)
    private String executSchdulMnt;

    @Column(name = "EXECUT_SCHDUL_SECND", length = 2)
    private String executSchdulSecnd;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BatchSchdul(String batchSchdulId, String batchOpertId, String executCycle,
            String executSchdulDe, String executSchdulHour, String executSchdulMnt,
            String executSchdulSecnd, String frstRegisterId) {
        this.batchSchdulId = batchSchdulId;
        this.batchOpertId = batchOpertId;
        this.executCycle = executCycle;
        this.executSchdulDe = executSchdulDe;
        this.executSchdulHour = executSchdulHour;
        this.executSchdulMnt = executSchdulMnt;
        this.executSchdulSecnd = executSchdulSecnd;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
