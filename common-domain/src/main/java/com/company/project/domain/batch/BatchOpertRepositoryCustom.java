package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 배치작업 Repository Custom 인터페이스
 */
public interface BatchOpertRepositoryCustom {
    Page<BatchOpert> searchBatchOperts(String searchCondition, String searchKeyword, Pageable pageable);
}
