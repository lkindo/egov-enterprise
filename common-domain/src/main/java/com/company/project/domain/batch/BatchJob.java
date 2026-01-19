package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 배치작업 JPA Entity
 * 레거시 테이블: COMTNBATCHOPERT
 */
@Entity
@Table(name = "NBATCHOPERT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BatchJob {

    @Id
    @Column(name = "BATCH_OPERT_ID", length = 20)
    private String batchOpertId;

    @Column(name = "BATCH_OPERT_NM", length = 100, nullable = false)
    private String batchOpertNm;

    @Column(name = "BATCH_PROGRM", length = 255)
    private String batchProgrm;

    @Column(name = "PARAMTR", length = 500)
    private String paramtr;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BatchJob(String batchOpertId, String batchOpertNm, String batchProgrm,
            String paramtr, String useAt, String frstRegisterId) {
        this.batchOpertId = batchOpertId;
        this.batchOpertNm = batchOpertNm;
        this.batchProgrm = batchProgrm;
        this.paramtr = paramtr;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String batchOpertNm, String batchProgrm, String paramtr,
            String useAt, String updusrId) {
        this.batchOpertNm = batchOpertNm;
        this.batchProgrm = batchProgrm;
        this.paramtr = paramtr;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
