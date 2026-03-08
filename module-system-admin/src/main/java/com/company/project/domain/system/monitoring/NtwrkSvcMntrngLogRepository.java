package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface NtwrkSvcMntrngLogRepository extends JpaRepository<NtwrkSvcMntrngLog, String> {
    Page<NtwrkSvcMntrngLog> findBySysNmContaining(String sysNm, Pageable pageable);
    Page<NtwrkSvcMntrngLog> findByCreatDtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
