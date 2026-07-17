package nuri.business.service.memoreport;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.business.service.memoreport.dto.MemoReportMapper;
import nuri.foundation.core.exception.BusinessException;
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
public class MemoReportService extends BaseAbstractService {

    private final MemoReportRepository memoReportRepository;
    private final EgovIdGnrService egovMemoReportIdGnrService;
    private final MemoReportMapper memoReportMapper;

    public Page<MemoReportDto> getMemoReportList(String keyword, @NonNull Pageable pageable) {
        return memoReportRepository.searchMemoReports(null, keyword, Objects.requireNonNull(pageable))
                .map(memoReportMapper::toDto);
    }

    public Page<MemoReportDto> getMyReportList(String writerId, @NonNull Pageable pageable) {
        return memoReportRepository.findByUserId(writerId, Objects.requireNonNull(pageable))
                .map(memoReportMapper::toDto);
    }

    public Page<MemoReportDto> getReceivedReportList(String rptUserId, @NonNull Pageable pageable) {
        return memoReportRepository.findByRptrId(rptUserId, Objects.requireNonNull(pageable))
                .map(memoReportMapper::toDto);
    }

    public MemoReportDto getMemoReport(@NonNull String rptId) {
        return memoReportRepository.findById(rptId)
                .map(memoReportMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

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
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public void updateMemoReport(String rptId, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(rptId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 작성자/관리자만 수정
        entity.update(dto.getRptTtl(), dto.getMemoRptYmd(), entity.getUserId(), dto.getRptrId(),
                dto.getRptCn(), dto.getAtchFileId());
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteMemoReport(@NonNull String rptId) {
        MemoReport entity = memoReportRepository.findById(rptId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 작성자/관리자만 삭제
        memoReportRepository.delete(entity);
    }

    @Transactional
    public void readMemoReport(@NonNull String rptId) {
        memoReportRepository.findById(rptId).ifPresent(entity -> {
            entity.updateInqireDt(java.time.LocalDateTime.now());
        });
    }

    @Transactional
    public void updateDrctMatter(String rptId, String instrCn) {
        MemoReport entity = memoReportRepository.findById(rptId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.updateDrctMatter(instrCn, java.time.LocalDateTime.now());
    }
}
