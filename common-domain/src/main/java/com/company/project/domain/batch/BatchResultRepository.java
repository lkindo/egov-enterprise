package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 배치결과 Repository
 */
public interface BatchResultRepository extends JpaRepository<BatchResult, String> {

    Page<BatchResult> findByBatchSchdulId(String batchSchdulId, Pageable pageable);

    Page<BatchResult> findByBatchOpertId(String batchOpertId, Pageable pageable);
}
