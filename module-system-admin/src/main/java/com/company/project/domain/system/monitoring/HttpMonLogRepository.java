package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface HttpMonLogRepository extends JpaRepository<HttpMonLog, String> {
    Page<HttpMonLog> findByWebKindContaining(String webKind, Pageable pageable);
    Page<HttpMonLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
