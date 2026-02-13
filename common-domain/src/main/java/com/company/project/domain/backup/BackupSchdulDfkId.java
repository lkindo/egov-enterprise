package com.company.project.domain.backup;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class BackupSchdulDfkId implements Serializable {

    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @Column(name = "EXECUT_SCHDUL_DFK_SE", length = 1)
    private String executSchdulDfkSe;
}
