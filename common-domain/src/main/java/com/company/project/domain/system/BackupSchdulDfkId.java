package com.company.project.domain.system;

import lombok.*;

import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode
public class BackupSchdulDfkId implements Serializable {
    private String backupOpertId;
    private String executSchdulDfkSe;
}
