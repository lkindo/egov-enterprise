package com.company.project.service.backup;

import com.company.project.service.backup.dto.BackupOpertDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovBackupOpertService {
    Page<BackupOpertDto> getBackupOpertList(String condition, String keyword, Pageable pageable);

    BackupOpertDto getBackupOpert(String backupOpertId);

    String createBackupOpert(String userId, BackupOpertDto dto);

    void updateBackupOpert(String backupOpertId, String userId, BackupOpertDto dto);

    void deleteBackupOpert(String backupOpertId);
}
