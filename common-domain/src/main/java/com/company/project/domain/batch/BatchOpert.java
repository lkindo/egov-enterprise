package com.company.project.domain.batch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBATCHOPERT")
public class BatchOpert {

    @Id
    @Column(name = "BATCH_OPERT_ID", length = 20)
    private String batchOpertId;

    @Column(name = "BATCH_OPERT_NM", length = 60)
    private String batchOpertNm;

    @Column(name = "BATCH_PROGRM", length = 255)
    private String batchProgrm;

    @Column(name = "PARAMTR", length = 250)
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
    public BatchOpert(String batchOpertId, String batchOpertNm, String batchProgrm, String paramtr, String useAt,
            String frstRegisterId) {
        this.batchOpertId = batchOpertId;
        this.batchOpertNm = batchOpertNm;
        this.batchProgrm = batchProgrm;
        this.paramtr = paramtr;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public void delete() {
        this.useAt = "N";
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
