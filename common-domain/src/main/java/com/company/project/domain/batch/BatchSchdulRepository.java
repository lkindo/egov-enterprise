package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 배치스케줄 Repository
 */
public interface BatchSchdulRepository extends JpaRepository<BatchSchdul, String> {

    Page<BatchSchdul> findByBatchOpertId(String batchOpertId, Pageable pageable);
}
