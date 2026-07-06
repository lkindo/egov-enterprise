package nuri.business.service.report;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkReportService extends BaseAbstractService implements EgovWorkReportService {

    private final WorkReportRepository workReportRepository;

    @Override
    @Transactional
    public void createWorkReport(WorkReportDto dto) {
        WorkReport entity = WorkReport.builder()
                .rptId(dto.getRptId())
                .rptTtl(dto.getRptTtl())
                .rptCn(dto.getRptCn())
                .rptSeCd(dto.getRptSeCd())
                .userId(dto.getUserId())
                .atchFileId(dto.getAtchFileId())
                .build();
        workReportRepository.save(entity);
    }

    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        WorkReport entity = workReportRepository.findById(Objects.requireNonNull(dto.getRptId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getRptTtl(), dto.getRptCn(), dto.getAtchFileId(), dto.getRptSeCd());
        entity.setLastMdfrId(dto.getUserId());
    }

    @Transactional
    public void deleteWorkReport(@NonNull String rptId) {
        workReportRepository.deleteById(rptId);
    }

    public Page<WorkReportDto> getWorkReportList(String searchId, String searchSe, String searchWrd, @NonNull Pageable pageable) {
        return workReportRepository.searchWorkReports(searchId, null, null, null, null, searchWrd, null, searchSe, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public WorkReportDto getWorkReport(@NonNull String rptId) {
        return workReportRepository.findById(rptId)
                .map(this::toDto)
                .orElse(null);
    }

    private WorkReportDto toDto(WorkReport entity) {
        return WorkReportDto.builder()
                .rptId(entity.getRptId())
                .rptTtl(entity.getRptTtl())
                .rptCn(entity.getRptCn())
                .rptSeCd(entity.getRptSeCd())
                .userId(entity.getUserId())
                .atchFileId(entity.getAtchFileId())
                .build();
    }
}
