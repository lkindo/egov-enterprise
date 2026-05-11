package nuri.foundation.domain.log;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WebLogRepositoryCustom {
    Page<WebLog> searchWebLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable);

    void deleteOldLogs(int months);
}
