package com.company.project.service.backup;

import com.company.project.service.backup.dto.BackupResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovBackupResultService {
    Page<BackupResultDto> getBackupResultList(String sttus, String searchFrom, String searchTo, String condition,
            String keyword, Pageable pageable);

    BackupResultDto getBackupResult(String backupResultId);

    void createBackupResult(String userId, BackupResultDto dto);

    void updateBackupResult(String backupResultId, String userId, BackupResultDto dto);

    void deleteBackupResult(String backupResultId);
}
