package com.company.project.business.service.report;

import com.company.project.business.service.report.dto.WorkReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovWorkReportService {
    void registerWorkReport(WorkReportDto dto);

    void updateWorkReport(WorkReportDto dto);

    void deleteWorkReport(String reportId);

    WorkReportDto getWorkReport(String reportId);

    Page<WorkReportDto> getWorkReportList(String writerId, Pageable pageable);
}
