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
@Table(name = "NBATCHSCHDUL")
public class BatchSchdul {

    @Id
    @Column(name = "BATCH_SCHDUL_ID", length = 20)
    private String batchSchdulId;

    @Transient
    private String batchOpertId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BATCH_OPERT_ID")
    private BatchOpert batchOpert;

    public String getBatchOpertId() {
        return batchOpert != null ? batchOpert.getBatchOpertId() : batchOpertId;
    }

    @OneToMany(mappedBy = "batchSchdul", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<BatchSchdulDfk> batchSchdulDfks = new java.util.ArrayList<>();

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
