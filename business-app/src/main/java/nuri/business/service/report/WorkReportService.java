package nuri.business.service.report;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
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
public class WorkReportService extends BaseAbstractService {

    private final WorkReportRepository workReportRepository;

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
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 작성자(frstRgtrId=loginId) 본인 또는 관리자만 수정 가능.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        entity.update(dto.getRptTtl(), dto.getRptCn(), dto.getAtchFileId(), dto.getRptSeCd());
        // lastMdfrId 는 @LastModifiedBy 감사자가 loginId 로 기록한다.
        // 클라이언트 DTO 값(dto.getUserId())으로 세팅하면 감사자 위조가 되므로 수동 설정하지 않는다.
    }

    @Transactional
    public void deleteWorkReport(@NonNull String rptId) {
        WorkReport entity = workReportRepository.findById(rptId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 작성자 본인 또는 관리자만 삭제 가능.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        workReportRepository.delete(entity);
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
