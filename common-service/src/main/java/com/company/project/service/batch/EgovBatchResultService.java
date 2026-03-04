package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 諛곗?寃곌낵 ??퉬???명꽣??씠??
 */
public interface EgovBatchResultService {

    Page<BatchResultDto> getBatchResultList(String sttus, String searchKeywordFrom, String searchKeywordTo,
            String searchCondition, String searchKeyword, Pageable pageable);

    BatchResultDto getBatchResult(String batchResultId);

    void deleteBatchResult(String batchResultId);
}