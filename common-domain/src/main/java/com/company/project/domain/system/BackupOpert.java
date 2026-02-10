package com.company.project.domain.system;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@DynamicUpdate
@Table(name = "NBACKUPOPERT")
public class BackupOpert {

    @Id
    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Column(name = "BACKUP_OPERT_NM", length = 60)
    private String backupOpertNm;

    @Column(name = "BACKUP_ORGINL_DRCTRY", length = 255)
    private String backupOrginlDrctry;

    @Column(name = "BACKUP_STRE_DRCTRY", length = 255)
    private String backupStreDrctry;

    @Column(name = "CMPRS_SE", length = 2)
    private String cmprsSe;

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

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "RGSDE")
    private LocalDate regstYmd;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @PrePersist
    public void prePersist() {
        this.useAt = "Y";
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
