package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NBATCHRESULT")
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

    @Column(name = "STTUS", length = 2)
    private String sttus;

    @Column(name = "ERROR_INFO", length = 2000)
    private String errorInfo;

    @Column(name = "EXECUT_BEGIN_TM", length = 14)
    private String executBeginTime;

    @Column(name = "EXECUT_END_TM", length = 14)
    private String executEndTime;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    public void prePersist() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void setFrstRegistPnttm(String pnttm) {
        if (pnttm != null) {
            try {
                this.frstRegistPnttm = LocalDateTime.parse(pnttm);
            } catch (Exception e) {
                // handle parsing error if necessary
            }
        }
    }

    public void setLastUpdtPnttm(String pnttm) {
        if (pnttm != null) {
            try {
                this.lastUpdtPnttm = LocalDateTime.parse(pnttm);
            } catch (Exception e) {
                // handle parsing error if necessary
            }
        }
    }
}
