package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchJobDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 배치작업 서비스 인터페이스
 */
public interface EgovBatchJobService {

    Page<BatchJobDto> getBatchJobList(String keyword, Pageable pageable);

    BatchJobDto getBatchJob(String batchOpertId);

    String createBatchJob(String userId, BatchJobDto dto);

    void updateBatchJob(String batchOpertId, String userId, BatchJobDto dto);

    void deleteBatchJob(String batchOpertId);

    List<BatchJobDto> getActiveBatchJobs();
}
