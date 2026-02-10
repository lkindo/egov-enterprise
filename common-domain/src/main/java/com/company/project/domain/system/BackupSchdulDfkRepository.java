package com.company.project.domain.system;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BackupSchdulDfkRepository extends JpaRepository<BackupSchdulDfk, BackupSchdulDfkId> {
    List<BackupSchdulDfk> findByBackupOpertId(String backupOpertId);

    void deleteByBackupOpertId(String backupOpertId);

    List<BackupSchdulDfk> findByBackupOpertIdIn(List<String> backupOpertIds);
}
