package com.company.project.domain.backup;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBACKUPRESULT")
public class BackupResult {

    @Id
    @Column(name = "BACKUP_RESULT_ID", length = 20)
    private String backupResultId;

    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BACKUP_OPERT_ID", insertable = false, updatable = false)
    private BackupOpert backupOpert;

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
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Builder
    public BackupResult(String backupResultId, String backupOpertId, String backupFile, String sttus, String errorInfo,
            String executBeginTime, String executEndTime, String frstRegisterId) {
        this.backupResultId = backupResultId;
        this.backupOpertId = backupOpertId;
        this.backupFile = backupFile;
        this.sttus = sttus;
        this.errorInfo = errorInfo;
        this.executBeginTime = executBeginTime;
        this.executEndTime = executEndTime;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
