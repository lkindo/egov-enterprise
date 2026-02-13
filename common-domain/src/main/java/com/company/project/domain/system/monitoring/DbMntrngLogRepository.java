package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface DbMntrngLogRepository extends JpaRepository<DbMntrngLog, String> {
    Page<DbMntrngLog> findByDataSourcNmContaining(String dataSourcNm, Pageable pageable);
    Page<DbMntrngLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
