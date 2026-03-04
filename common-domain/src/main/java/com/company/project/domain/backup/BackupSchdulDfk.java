package com.company.project.domain.backup;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "NBACKUPSCHDULDFK")
public class BackupSchdulDfk {

    @EmbeddedId
    private BackupSchdulDfkId id;

    @Builder
    public BackupSchdulDfk(String backupOpertId, String executSchdulDfkSe, BackupOpert backupOpert) {
        this.id = new BackupSchdulDfkId(backupOpertId, executSchdulDfkSe);
        this.backupOpert = backupOpert;
    }

    @MapsId("backupOpertId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BACKUP_OPERT_ID")
    private BackupOpert backupOpert;

    public String getBackupOpertId() {
        return id != null ? id.getBackupOpertId() : null;
    }

    public String getExecutSchdulDfkSe() {
        return id != null ? id.getExecutSchdulDfkSe() : null;
    }
}