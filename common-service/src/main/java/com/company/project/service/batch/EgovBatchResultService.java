package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 배치결과 서비스 인터페이스
 */
public interface EgovBatchResultService {

    Page<BatchResultDto> getBatchResultList(String batchSchdulId, Pageable pageable);

    BatchResultDto getBatchResult(String batchResultId);

    void deleteBatchResult(String batchResultId);
}
