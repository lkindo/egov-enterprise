package nuri.business.service.memoreport;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
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
public class MemoReportService extends BaseAbstractService implements EgovMemoReportService {

    private final MemoReportRepository memoReportRepository;
    private final EgovIdGnrService egovMemoReportIdGnrService;

    @Override
    public Page<MemoReportDto> getMemoReportList(String keyword, @NonNull Pageable pageable) {
        return memoReportRepository.searchMemoReports(null, keyword, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getMyReportList(String writerId, @NonNull Pageable pageable) {
        return memoReportRepository.findByUserId(writerId, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getReceivedReportList(String rptUserId, @NonNull Pageable pageable) {
        return memoReportRepository.findByRptrId(rptUserId, Objects.requireNonNull(pageable))
                .map(MemoReportDto::from);
    }

    @Override
    public MemoReportDto getMemoReport(@NonNull String rptId) {
        return memoReportRepository.findById(rptId)
                .map(MemoReportDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createMemoReport(String userId, MemoReportDto dto) {
        try {
            String id = egovMemoReportIdGnrService.getNextStringId();
            MemoReport entity = MemoReport.builder()
                    .rptId(id)
                    .rptTtl(dto.getRptTtl())
                    .memoRptYmd(dto.getMemoRptYmd())
                    .userId(userId)
                    .rptrId(dto.getRptrId())
                    .rptCn(dto.getRptCn())
                    .atchFileId(dto.getAtchFileId())
                    .build();
            memoReportRepository.save(entity);
            return id;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public void updateMemoReport(String rptId, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(rptId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getRptTtl(), dto.getMemoRptYmd(), entity.getUserId(), dto.getRptrId(),
                dto.getRptCn(), dto.getAtchFileId());
        entity.setLastMdfrId(userId);
    }

    @Override
    @Transactional
    public void deleteMemoReport(@NonNull String rptId) {
        memoReportRepository.deleteById(rptId);
    }

    @Override
    @Transactional
    public void readMemoReport(@NonNull String rptId) {
        memoReportRepository.findById(rptId).ifPresent(entity -> {
            entity.updateInqireDt(java.time.LocalDateTime.now().toString());
        });
    }

    @Override
    @Transactional
    public void updateDrctMatter(String rptId, String instrCn) {
        MemoReport entity = memoReportRepository.findById(rptId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateDrctMatter(instrCn, java.time.LocalDateTime.now().toString());
    }
}
