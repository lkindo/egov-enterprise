package com.company.project.service.backup.dto;

import com.company.project.domain.backup.BackupResult;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupResultDto {
    private String backupResultId;
    private String backupOpertId;
    private String backupOpertNm;
    private String backupFile;
    private String sttus;
    private String sttusNm;
    private String executBeginTime;
    private String executEndTime;
    private String errorInfo;
    private String backupOrginlDrctry;
    private String backupStreDrctry;
    private String frstRegisterId;
    private String frstRegistPnttm;

    public static BackupResultDto from(BackupResult entity) {
        return BackupResultDto.builder()
                .backupResultId(entity.getBackupResultId())
                .backupOpertId(entity.getBackupOpertId())
                .backupOpertNm(entity.getBackupOpert() != null ? entity.getBackupOpert().getBackupOpertNm() : null)
                .backupFile(entity.getBackupFile())
                .sttus(entity.getSttus())
                .executBeginTime(entity.getExecutBeginTime())
                .executEndTime(entity.getExecutEndTime())
                .errorInfo(entity.getErrorInfo())
                .backupOrginlDrctry(
                        entity.getBackupOpert() != null ? entity.getBackupOpert().getBackupOrginlDrctry() : null)
                .backupStreDrctry(
                        entity.getBackupOpert() != null ? entity.getBackupOpert().getBackupStreDrctry() : null)
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .build();
    }
}
