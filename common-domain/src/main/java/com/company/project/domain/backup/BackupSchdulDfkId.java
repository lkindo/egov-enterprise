package com.company.project.domain.backup;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BackupSchdulDfkId implements Serializable {
    private String backupOpertId;
    private String executSchdulDfkSe;
}
