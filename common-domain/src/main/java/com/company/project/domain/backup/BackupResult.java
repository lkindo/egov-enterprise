package com.company.project.domain.backup;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "NBACKUPRESULT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
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

    @Column(name = "EXECUT_BEGIN_TM", length = 14)
    private String executBeginTime;

    @Column(name = "EXECUT_END_TM", length = 14)
    private String executEndTime;

    @Column(name = "ERROR_INFO", length = 2000)
    private String errorInfo;

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", updatable = false, length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BACKUP_OPERT_ID", insertable = false, updatable = false)
    private BackupOpert backupOpert;
}
