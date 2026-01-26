package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BackupOpertRepository extends JpaRepository<BackupOpert, String> {

    @EntityGraph(attributePaths = "executSchdulDfkSes")
    @Query("SELECT b FROM BackupOpert b WHERE b.useAt = 'Y' " +
            "AND (:condition = '0' AND b.backupOpertNm LIKE %:keyword% OR " +
            ":condition = '1' AND b.backupOrginlDrctry LIKE %:keyword% OR " +
            ":keyword IS NULL OR :keyword = '')")
    Page<BackupOpert> searchBackupOperts(@Param("condition") String condition,
            @Param("keyword") String keyword,
            Pageable pageable);
}
