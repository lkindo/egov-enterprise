package com.company.project.domain.batch;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/**
 * 배치작업 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class BatchOpertRepositoryImpl implements BatchOpertRepositoryCustom {

    @Override
    public Page<BatchOpert> searchBatchOperts(String searchCondition, String searchKeyword, Pageable pageable) {
        return new PageImpl<>(java.util.Collections.emptyList(), pageable, 0);
    }
}
