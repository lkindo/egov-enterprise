package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface BackupResultRepositoryCustom {
    Page<BackupResult> searchBackupResults(String sttus, String searchFrom, String searchTo, String searchCondition, String searchKeyword, Pageable pageable);
}
