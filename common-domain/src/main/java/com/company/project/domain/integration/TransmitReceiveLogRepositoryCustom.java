package com.company.project.domain.integration;

import java.util.List;

public interface TransmitReceiveLogRepositoryCustom {
    List<TransmitReceiveLog> searchLogs(String searchWrd, String searchBgnDe, String searchEndDe, int offset,
            int limit);

    long countLogs(String searchWrd, String searchBgnDe, String searchEndDe);

    void insertLogSummary();

    void deleteOldLogs(int days);
}
