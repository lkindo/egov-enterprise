package com.company.project.domain.backup;

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
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
