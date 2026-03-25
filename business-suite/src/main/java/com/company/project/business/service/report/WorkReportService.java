package com.company.project.business.service.report;

import com.company.project.business.domain.report.WorkReport;
import com.company.project.business.domain.report.WorkReportRepository;
import com.company.project.business.service.report.dto.WorkReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

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
                .createdBy(dto.getWriterId())
                .lastModifiedBy(dto.getWriterId())
                .build();
        workReportRepository.save(Objects.requireNonNull(report));
    }

    @Override
    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        workReportRepository.findById(Objects.requireNonNull(dto.getReportId()))
                .ifPresent(r -> r.update(
                        dto.getReportSubject(),
                        dto.getReportContent(),
                        dto.getReportType(),
                        dto.getReportDate(),
                        dto.getReportStatus()));
    }

    @Override
    @Transactional
    public void deleteWorkReport(String reportId) {
        workReportRepository.deleteById(Objects.requireNonNull(reportId));
    }

    @Override
    public WorkReportDto getWorkReport(String reportId) {
        return workReportRepository.findById(Objects.requireNonNull(reportId))
                .map(r -> Objects.requireNonNull(WorkReportDto.builder()
                        .reportId(r.getReportId())
                        .reportSubject(r.getReportSubject())
                        .reportContent(r.getReportContent())
                        .reportType(r.getReportType())
                        .reportDate(r.getReportDate())
                        .writerId(r.getWriterId())
                        .reportStatus(r.getReportStatus())
                        .build()))
                .orElse(null);
    }

    @Override
    public Page<WorkReportDto> getWorkReportList(String writerId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return workReportRepository.findAll(pageable)
                .map(r -> Objects.requireNonNull(WorkReportDto.builder()
                        .reportId(r.getReportId())
                        .reportSubject(r.getReportSubject())
                        .reportDate(r.getReportDate())
                        .reportStatus(r.getReportStatus())
                        .build()));
    }
}
