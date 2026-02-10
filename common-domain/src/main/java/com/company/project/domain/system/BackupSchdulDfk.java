package com.company.project.domain.system;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@IdClass(BackupSchdulDfkId.class)
@Table(name = "NBACKUPSCHDULDFK")
public class BackupSchdulDfk {

    @Id
    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Id
    @Column(name = "EXECUT_SCHDUL_DFK_SE", length = 1)
    private String executSchdulDfkSe;
}
