package com.company.project.service.report;

import com.company.project.domain.report.WorkReport;
import com.company.project.domain.report.WorkReportRepository;
import com.company.project.service.report.dto.WorkReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkReportService implements EgovWorkReportService {

    private final WorkReportRepository workReportRepository;

    @Override
    @Transactional
    public void registerWorkReport(WorkReportDto dto) {
        WorkReport report = WorkReport.builder()
                .reportId(dto.getReportId())
                .reportSubject(dto.getReportSubject())
                .reportContent(dto.getReportContent())
                .reportType(dto.getReportType())
                .reportDate(dto.getReportDate())
                .writerId(dto.getWriterId())
                .reportStatus(dto.getReportStatus())
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        workReportRepository.save(report);
    }

    @Override
    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        workReportRepository.findById(dto.getReportId())
                .ifPresent(r -> r.update(
                        dto.getReportSubject(),
                        dto.getReportContent(),
                        dto.getReportType(),
                        dto.getReportDate(),
                        dto.getReportStatus(),
                        dto.getWriterId()));
    }

    @Override
    @Transactional
    public void deleteWorkReport(String reportId) {
        workReportRepository.deleteById(reportId);
    }

    @Override
    public WorkReportDto getWorkReport(String reportId) {
        return workReportRepository.findById(reportId)
                .map(r -> WorkReportDto.builder()
                        .reportId(r.getReportId())
                        .reportSubject(r.getReportSubject())
                        .reportContent(r.getReportContent())
                        .reportType(r.getReportType())
                        .reportDate(r.getReportDate())
                        .writerId(r.getWriterId())
                        .reportStatus(r.getReportStatus())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<WorkReportDto> getWorkReportList(String writerId, Pageable pageable) {
        return workReportRepository.findAll(pageable)
                .map(r -> WorkReportDto.builder()
                        .reportId(r.getReportId())
                        .reportSubject(r.getReportSubject())
                        .reportDate(r.getReportDate())
                        .reportStatus(r.getReportStatus())
                        .build());
    }
}
