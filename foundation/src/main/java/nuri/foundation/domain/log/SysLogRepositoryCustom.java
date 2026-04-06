package nuri.foundation.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SysLogRepositoryCustom {
    Page<SysLog> searchSysLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);

    void insertLogSummary();

    void deleteOldLogs(int months);
}
