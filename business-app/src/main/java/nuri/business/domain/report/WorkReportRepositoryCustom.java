package nuri.business.domain.report;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WorkReportRepositoryCustom {
    Page<WorkReport> searchWorkReports(String searchId, String searchCnd, String searchWrd, String searchSe,
            Pageable pageable);
}
