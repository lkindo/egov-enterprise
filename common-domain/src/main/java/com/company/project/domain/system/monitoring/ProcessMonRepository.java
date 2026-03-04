package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessMonRepository extends JpaRepository<ProcessMon, String> {
    Page<ProcessMon> findByProcessNmContaining(String processNm, Pageable pageable);
    Page<ProcessMon> findByProcsSttus(String procsSttus, Pageable pageable);
    Page<ProcessMon> findByProcessNmContainingAndProcsSttus(String processNm, String procsSttus, Pageable pageable);
}