package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchSchdulDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 諛곗튂?ㅼ?以??쒕퉬???명꽣?섏씠??
 */
public interface EgovBatchSchdulService {

    Page<BatchSchdulDto> getBatchSchdulList(String searchCondition, String searchKeyword,
            @org.springframework.lang.NonNull Pageable pageable);

    BatchSchdulDto getBatchSchdul(String batchSchdulId);

    String createBatchSchdul(String userId, BatchSchdulDto dto);

    void updateBatchSchdul(String batchSchdulId, String userId, BatchSchdulDto dto);

    void deleteBatchSchdul(String batchSchdulId);
}
