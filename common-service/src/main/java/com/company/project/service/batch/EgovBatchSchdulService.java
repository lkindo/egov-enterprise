package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchSchdulDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 배치스케줄 서비스 인터페이스
 */
public interface EgovBatchSchdulService {

    Page<BatchSchdulDto> getBatchSchdulList(String batchOpertId, Pageable pageable);

    BatchSchdulDto getBatchSchdul(String batchSchdulId);

    String createBatchSchdul(String userId, BatchSchdulDto dto);

    void updateBatchSchdul(String batchSchdulId, String userId, BatchSchdulDto dto);

    void deleteBatchSchdul(String batchSchdulId);
}
