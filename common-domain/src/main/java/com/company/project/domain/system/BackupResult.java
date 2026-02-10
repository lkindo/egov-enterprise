package com.company.project.domain.system;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@DynamicUpdate
@Table(name = "NBACKUPRESULT")
public class BackupResult {

    @Id
    @Column(name = "BACKUP_RESULT_ID", length = 20)
    private String backupResultId;

    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Column(name = "BACKUP_FILE", length = 255)
    private String backupFile;

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
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @PrePersist
    public void prePersist() {
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
