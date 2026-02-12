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
}
