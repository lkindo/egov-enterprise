package com.company.project.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SysLogRepositoryCustom {
    Page<SysLog> searchSysLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);
}
