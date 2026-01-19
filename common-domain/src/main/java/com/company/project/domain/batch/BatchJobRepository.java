package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 배치작업 Repository
 */
public interface BatchJobRepository extends JpaRepository<BatchJob, String> {

    Page<BatchJob> findByBatchOpertNmContaining(String batchOpertNm, Pageable pageable);

    Page<BatchJob> findByBatchProgrmContaining(String batchProgrm, Pageable pageable);

    List<BatchJob> findByUseAt(String useAt);
}
