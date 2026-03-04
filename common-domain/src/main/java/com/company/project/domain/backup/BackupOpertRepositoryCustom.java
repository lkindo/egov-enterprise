package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface BackupOpertRepositoryCustom {
    Page<BackupOpert> searchBackupOperts(String searchCondition, String searchKeyword, Pageable pageable);
    Optional<BackupOpert> findByIdWithDfk(String backupOpertId);
}