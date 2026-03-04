package com.company.project.domain.backup;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBACKUPRESULT")
public class BackupResult extends BaseEntity {

    @Id
    @Column(name = "BACKUP_RESULT_ID", length = 20)
    private String backupResultId;

    @Transient
    private String backupOpertId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BACKUP_OPERT_ID")
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

    @Builder
    public BackupResult(String backupResultId, String backupOpertId, BackupOpert backupOpert, String backupFile,
            String sttus, String errorInfo,
            String executBeginTime, String executEndTime, String frstRegisterId) {
        this.backupResultId = backupResultId;
        this.backupOpertId = backupOpertId;
        this.backupOpert = backupOpert;
        this.backupFile = backupFile;
        this.sttus = sttus;
        this.errorInfo = errorInfo;
        this.executBeginTime = executBeginTime;
        this.executEndTime = executEndTime;
        this.setFrstRegisterId(frstRegisterId);
    }

    // Missing method for compatibility
    public String getFrstRegistPnttm() {
        return this.getCreatedDate() != null ? this.getCreatedDate().toString() : null;
    }
}