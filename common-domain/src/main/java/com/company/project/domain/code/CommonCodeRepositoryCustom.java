package com.company.project.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CommonCodeRepositoryCustom {
    Page<CommonCode> searchCommonCodes(String searchCondition, String searchKeyword, Pageable pageable);
}
