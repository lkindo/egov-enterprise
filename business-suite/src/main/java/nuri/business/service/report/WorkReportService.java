package nuri.business.service.report;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
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
                .rptId(dto.getRptId())
                .rptTtl(dto.getRptTtl())
                .rptCn(dto.getRptCn())
                .rptTypeCd(dto.getRptTypeCd())
                .rptYmd(dto.getRptYmd())
                .writerId(dto.getWriterId())
                .rptSttsCd(dto.getRptSttsCd())
                .createdBy(dto.getWriterId())
                .lastModifiedBy(dto.getWriterId())
                .build();
        workReportRepository.save(Objects.requireNonNull(report));
    }

    @Override
    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        workReportRepository.findById(Objects.requireNonNull(dto.getRptId()))
                .ifPresent(r -> r.update(
                        dto.getRptTtl(),
                        dto.getRptCn(),
                        dto.getRptTypeCd(),
                        dto.getRptYmd(),
                        dto.getRptSttsCd()));
    }

    @Override
    @Transactional
    public void deleteWorkReport(String reprtId) {
        workReportRepository.deleteById(Objects.requireNonNull(reprtId));
    }

    @Override
    public WorkReportDto getWorkReport(String reprtId) {
        return workReportRepository.findById(Objects.requireNonNull(reprtId))
                .map(r -> Objects.requireNonNull(WorkReportDto.builder()
                        .rptId(r.getRptId())
                        .rptTtl(r.getRptTtl())
                        .rptCn(r.getRptCn())
                        .rptTypeCd(r.getRptTypeCd())
                        .rptYmd(r.getRptYmd())
                        .writerId(r.getWriterId())
                        .rptSttsCd(r.getRptSttsCd())
                        .build()))
                .orElse(null);
    }

    @Override
    public Page<WorkReportDto> getWorkReportList(String writerId, String searchWrd, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return workReportRepository.searchWorkReports(null, null, null, null, "0", searchWrd, null, null, pageable)
                .map(r -> Objects.requireNonNull(WorkReportDto.builder()
                        .rptId(r.getRptId())
                        .rptTtl(r.getRptTtl())
                        .rptYmd(r.getRptYmd())
                        .rptSttsCd(r.getRptSttsCd())
                        .build()));
    }
}
