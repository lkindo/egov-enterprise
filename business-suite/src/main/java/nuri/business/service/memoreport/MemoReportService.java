package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoReportService extends BaseAbstractService {

    private final MemoReportRepository memoReportRepository;
    private final EgovIdGnrService egovMemoReportIdGnrService;

    public Page<MemoReportDto> getMemoReportList(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        return memoReportRepository.searchMemoReports(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    public Page<MemoReportDto> getMemoReportListByWriter(String writerId, @NonNull Pageable pageable) {
        return memoReportRepository.findByWriterId(writerId, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    public Page<MemoReportDto> getMemoReportListByReportr(String reportrId, @NonNull Pageable pageable) {
        return memoReportRepository.findByReportrId(reportrId, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    public MemoReportDto getMemoReport(@NonNull String reportId) {
        return memoReportRepository.findById(reportId)
                .map(MemoReportDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createMemoReport(String userId, MemoReportDto dto) throws Exception {
        String id = egovMemoReportIdGnrService.getNextStringId();
        MemoReport entity = MemoReport.builder()
                .reportId(id)
                .reportSubject(dto.getReportSubject())
                .reprtDe(dto.getReprtDe())
                .writerId(userId)
                .reportrId(dto.getReportrId())
                .reportContents(dto.getReportContents())
                .atchFileId(dto.getAtchFileId())
                .createdBy(userId)
                .build();
        memoReportRepository.save(entity);
        return id;
    }

    @Transactional
    public void updateMemoReport(String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(dto.getReportId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getReportSubject(), dto.getReprtDe(), entity.getWriterId(), dto.getReportrId(),
                dto.getReportContents(), dto.getAtchFileId());
        entity.setLastModifiedBy(userId);
    }

    @Transactional
    public void deleteMemoReport(@NonNull String reportId) {
        memoReportRepository.deleteById(reportId);
    }

    @Transactional
    public void updateInqireDt(@NonNull String reportId) {
        memoReportRepository.findById(reportId).ifPresent(entity -> {
            entity.updateInqireDt(java.time.LocalDateTime.now().toString());
        });
    }
}
