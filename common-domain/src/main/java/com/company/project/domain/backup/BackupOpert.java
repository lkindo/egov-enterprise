package com.company.project.domain.backup;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "NBACKUPOPERT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class BackupOpert {

    @Id
    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Column(name = "BACKUP_OPERT_NM", nullable = false, length = 100)
    private String backupOpertNm;

    @Column(name = "BACKUP_ORGINL_DRCTRY", nullable = false, length = 255)
    private String backupOrginlDrctry;

    @Column(name = "BACKUP_STRE_DRCTRY", nullable = false, length = 255)
    private String backupStreDrctry;

    @Column(name = "CMPRS_SE", nullable = false, length = 2)
    private String cmprsSe;

    @Column(name = "EXECUT_CYCLE", nullable = false, length = 2)
    private String executCycle;

    @Column(name = "EXECUT_SCHDUL_DE", length = 20)
    private String executSchdulDe;

    @Column(name = "EXECUT_SCHDUL_HOUR", length = 2)
    private String executSchdulHour;

    @Column(name = "EXECUT_SCHDUL_MNT", length = 2)
    private String executSchdulMnt;

    @Column(name = "EXECUT_SCHDUL_SECND", length = 2)
    private String executSchdulSecnd;

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

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

    @OneToMany(mappedBy = "backupOpert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BackupSchdulDfk> executSchdulDfkSes = new ArrayList<>();
}
