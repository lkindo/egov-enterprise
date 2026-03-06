package com.company.project.domain.backup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BackupSchdulDfkRepository extends JpaRepository<BackupSchdulDfk, BackupSchdulDfkId> {
    List<BackupSchdulDfk> findByIdBackupOpertIdIn(List<String> backupOpertIds);
}
