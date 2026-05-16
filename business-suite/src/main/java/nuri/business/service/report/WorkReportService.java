package nuri.business.service.report;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkReportService extends BaseAbstractService implements EgovWorkReportService {

    private final WorkReportRepository workReportRepository;

    @Override
    @Transactional
    public void createWorkReport(WorkReportDto dto) {
        WorkReport entity = WorkReport.builder()
                .reportId(dto.getReportId())
                .reportSubject(dto.getReportSubject())
                .reportContents(dto.getReportContents())
                .reprtSe(dto.getReprtSe())
                .wrterId(dto.getWrterId())
                .atchFileId(dto.getAtchFileId())
                .createdBy(dto.getWrterId())
                .lastModifiedBy(dto.getWrterId())
                .build();
        workReportRepository.save(entity);
    }

    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        WorkReport entity = workReportRepository.findById(Objects.requireNonNull(dto.getReportId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getReportSubject(), dto.getReportContents(), dto.getAtchFileId(), dto.getReprtSe());
        entity.setLastModifiedBy(dto.getWrterId());
    }

    @Transactional
    public void deleteWorkReport(@NonNull String reportId) {
        workReportRepository.deleteById(reportId);
    }

    public Page<WorkReportDto> getWorkReportList(String searchId, String searchSe, String searchWrd, @NonNull Pageable pageable) {
        return workReportRepository.searchWorkReports(searchId, null, null, null, null, searchWrd, null, searchSe, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public WorkReportDto getWorkReport(@NonNull String reportId) {
        return workReportRepository.findById(reportId)
                .map(this::toDto)
                .orElse(null);
    }

    private WorkReportDto toDto(WorkReport entity) {
        return WorkReportDto.builder()
                .reportId(entity.getReportId())
                .reportSubject(entity.getReportSubject())
                .reportContents(entity.getReportContents())
                .reprtSe(entity.getReprtSe())
                .wrterId(entity.getWrterId())
                .atchFileId(entity.getAtchFileId())
                .build();
    }
}
