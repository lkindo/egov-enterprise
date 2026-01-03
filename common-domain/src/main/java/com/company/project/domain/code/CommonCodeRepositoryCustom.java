package com.company.project.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommonCodeRepositoryCustom {
    Page<CommonCodeDetailProjection> searchCommonCodeDetails(String searchCondition, String searchKeyword,
            Pageable pageable);
}
