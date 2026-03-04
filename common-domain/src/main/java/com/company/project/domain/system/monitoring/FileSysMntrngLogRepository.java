package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface FileSysMntrngLogRepository extends JpaRepository<FileSysMntrngLog, String> {
    Page<FileSysMntrngLog> findByFileSysNmContaining(String fileSysNm, Pageable pageable);
    Page<FileSysMntrngLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}