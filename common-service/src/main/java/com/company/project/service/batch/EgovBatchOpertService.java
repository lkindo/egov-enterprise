package com.company.project.service.batch;

import com.company.project.service.batch.dto.BatchOpertDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 諛곗튂?묒뾽 ?쒕퉬???명꽣?섏씠??
 */
public interface EgovBatchOpertService {

    Page<BatchOpertDto> getBatchOpertList(String searchCondition, String keyword,
            @org.springframework.lang.NonNull Pageable pageable);

    BatchOpertDto getBatchOpert(String batchOpertId);

    String createBatchOpert(String userId, BatchOpertDto dto);

    void updateBatchOpert(String batchOpertId, String userId, BatchOpertDto dto);

    void deleteBatchOpert(String batchOpertId);

    List<BatchOpertDto> getActiveBatchOperts();
}
