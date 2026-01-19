package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BackupResultRepository extends JpaRepository<BackupResult, String> {

    @Query("SELECT r FROM BackupResult r JOIN r.backupOpert o " +
            "WHERE (:sttus IS NULL OR r.sttus = :sttus) " +
            "AND (:searchFrom IS NULL OR r.executBeginTime >= :searchFrom) " +
            "AND (:searchTo IS NULL OR r.executBeginTime <= :searchTo) " +
            "AND (:condition = '0' AND o.backupOpertNm LIKE %:keyword% OR " +
            ":condition = '1' AND o.backupOrginlDrctry LIKE %:keyword% OR " +
            ":keyword IS NULL OR :keyword = '')")
    Page<BackupResult> searchBackupResults(@Param("sttus") String sttus,
            @Param("searchFrom") String searchFrom,
            @Param("searchTo") String searchTo,
            @Param("condition") String condition,
            @Param("keyword") String keyword,
            Pageable pageable);
}
