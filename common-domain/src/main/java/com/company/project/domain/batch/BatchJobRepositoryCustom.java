package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BatchJobRepositoryCustom {
    Page<BatchJob> search(String searchCondition, String searchKeyword, Pageable pageable);
}
