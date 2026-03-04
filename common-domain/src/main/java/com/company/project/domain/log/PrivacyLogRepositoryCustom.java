package com.company.project.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PrivacyLogRepositoryCustom {
    Page<PrivacyLog> searchPrivacyLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);
}