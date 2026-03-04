package com.company.project.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserLogRepositoryCustom {
    Page<UserLog> searchUserLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);

    void insertLogSummary();

    void deleteOldLogs(int months);
}