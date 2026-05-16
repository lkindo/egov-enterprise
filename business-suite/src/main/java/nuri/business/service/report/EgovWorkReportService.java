package nuri.business.service.report;

import nuri.business.service.report.dto.WorkReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovWorkReportService {
    void createWorkReport(WorkReportDto dto);
    void updateWorkReport(WorkReportDto dto);
    void deleteWorkReport(String reportId);
    Page<WorkReportDto> getWorkReportList(String searchId, String searchSe, String searchWrd, Pageable pageable);
    
    // legacy
    default Page<WorkReportDto> getWorkReportList(String searchId, String searchWrd, Pageable pageable) {
        return getWorkReportList(searchId, null, searchWrd, pageable);
    }

    WorkReportDto getWorkReport(String reportId);
}
