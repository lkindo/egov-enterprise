package com.company.project.domain.backup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupOpertRepository extends JpaRepository<BackupOpert, String>, BackupOpertRepositoryCustom {
}