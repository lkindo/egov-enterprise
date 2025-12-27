package com.company.project.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoginLogRepositoryCustom {
    Page<LoginLog> searchLoginLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);
}
