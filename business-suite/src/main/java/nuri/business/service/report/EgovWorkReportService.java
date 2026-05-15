package nuri.business.service.report;

import nuri.business.service.report.dto.WorkReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovWorkReportService {
    void registerWorkReport(WorkReportDto dto);

    void updateWorkReport(WorkReportDto dto);

    void deleteWorkReport(String rptId);

    WorkReportDto getWorkReport(String rptId);

    Page<WorkReportDto> getWorkReportList(String writerId, String searchWrd, Pageable pageable);
}
