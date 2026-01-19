package com.company.project.domain.backup;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "NBACKUPSCHDULDFK")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(BackupSchdulDfkId.class)
public class BackupSchdulDfk {

    @Id
    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Id
    @Column(name = "EXECUT_SCHDUL_DFK_SE", length = 1)
    private String executSchdulDfkSe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BACKUP_OPERT_ID", insertable = false, updatable = false)
    private BackupOpert backupOpert;
}
