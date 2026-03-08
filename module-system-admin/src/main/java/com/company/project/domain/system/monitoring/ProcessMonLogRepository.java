package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface ProcessMonLogRepository extends JpaRepository<ProcessMonLog, String> {
    Page<ProcessMonLog> findByProcessNmContaining(String processNm, Pageable pageable);
    Page<ProcessMonLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
