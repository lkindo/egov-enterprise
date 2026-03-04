package com.company.project.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SysHistoryRepositoryCustom {
    Page<SysHistory> searchSysHistories(String searchCnd, String searchWrd, Pageable pageable);
}