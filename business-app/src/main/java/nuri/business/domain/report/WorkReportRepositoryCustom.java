package nuri.business.domain.report;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WorkReportRepositoryCustom {
    Page<WorkReport> searchWorkReports(String searchId, String searchDe, String searchBgnDe, String searchEndDe,
            String searchCnd, String searchWrd, String searchSttus, String searchSe, Pageable pageable);
}
