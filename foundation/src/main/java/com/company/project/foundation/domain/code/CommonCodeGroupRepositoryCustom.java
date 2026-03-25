package com.company.project.foundation.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommonCodeGroupRepositoryCustom {
    Page<CommonCodeGroupProjection> searchCommonCodeGroups(String searchCondition, String searchKeyword,
            Pageable pageable);
}
