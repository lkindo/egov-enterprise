package com.company.project.service.backup.dto;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupSchdulDfk;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupOpertDto {
    private String backupOpertId;
    private String backupOpertNm;
    private String backupOrginlDrctry;
    private String backupStreDrctry;
    private String cmprsSe;
    private String cmprsSeNm;
    private String executCycle;
    private String executCycleNm;
    private String executSchdulDe;
    private String executSchdulHour;
    private String executSchdulMnt;
    private String executSchdulSecnd;
    private String[] executSchdulDfkSes;
    private String useAt;
    private String executSchdul;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;

    public static BackupOpertDto from(BackupOpert entity) {
        return from(entity, true);
    }

    public static BackupOpertDto from(BackupOpert entity, boolean includeChildren) {
        String[] dfkSes = null;
        if (includeChildren) {
            dfkSes = entity.getExecutSchdulDfkSes().stream()
                    .map(BackupSchdulDfk::getExecutSchdulDfkSe)
                    .toArray(String[]::new);
        }

        return BackupOpertDto.builder()
                .backupOpertId(entity.getBackupOpertId())
                .backupOpertNm(entity.getBackupOpertNm())
                .backupOrginlDrctry(entity.getBackupOrginlDrctry())
                .backupStreDrctry(entity.getBackupStreDrctry())
                .cmprsSe(entity.getCmprsSe())
                .executCycle(entity.getExecutCycle())
                .executSchdulDe(entity.getExecutSchdulDe())
                .executSchdulHour(entity.getExecutSchdulHour())
                .executSchdulMnt(entity.getExecutSchdulMnt())
                .executSchdulSecnd(entity.getExecutSchdulSecnd())
                .executSchdulDfkSes(dfkSes)
                .useAt(entity.getUseAt())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .build();
    }
}
