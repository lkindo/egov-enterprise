package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TrsmrcvMntrngLogRepository extends JpaRepository<TrsmrcvMntrngLog, String> {
    Page<TrsmrcvMntrngLog> findByMngrNmContaining(String mngrNm, Pageable pageable);
    Page<TrsmrcvMntrngLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}