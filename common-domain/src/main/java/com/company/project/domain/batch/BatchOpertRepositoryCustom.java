package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 獄쏄퀣??臾믩씜 Repository Custom ?紐낃숲??륁뵠??
 */
public interface BatchOpertRepositoryCustom {
    Page<BatchOpert> searchBatchOperts(String searchCondition, String searchKeyword, Pageable pageable);
}