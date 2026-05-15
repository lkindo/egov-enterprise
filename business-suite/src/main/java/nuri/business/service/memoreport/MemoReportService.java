package nuri.business.service.memoreport;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoReportService implements EgovMemoReportService {

    private final MemoReportRepository memoReportRepository;

    @Override
    public Page<MemoReportDto> getMemoReportList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return memoReportRepository.findAll(pageable).map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getMyReportList(String writerId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return memoReportRepository.findByWriterId(Objects.requireNonNull(writerId), pageable).map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getReceivedReportList(String rptUserId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return memoReportRepository.findByRptUserId(Objects.requireNonNull(rptUserId), pageable)
                .map(MemoReportDto::from);
    }

    @Override
    public MemoReportDto getMemoReport(String rptId) {
        return memoReportRepository.findById(Objects.requireNonNull(rptId))
                .map(MemoReportDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createMemoReport(String userId, MemoReportDto dto) {
        String id = "MRM_" + System.currentTimeMillis();
        MemoReport entity = MemoReport.builder()
                .rptId(id)
                .rptTtl(dto.getRptTtl())
                .rptYmd(dto.getRptYmd())
                .writerId(userId)
                .rptUserId(dto.getRptUserId())
                .rptCn(dto.getRptCn())
                .atchFileId(dto.getAtchFileId())
                .build();
        memoReportRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateMemoReport(String rptId, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(rptId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getRptTtl(), dto.getRptYmd(), userId, dto.getRptUserId(),
                dto.getRptCn(), dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteMemoReport(String rptId) {
        memoReportRepository.deleteById(Objects.requireNonNull(rptId));
    }

    @Override
    @Transactional
    public void readMemoReport(String rptId) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(rptId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateInqireDt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }

    @Override
    @Transactional
    public void updateDrctMatter(String rptId, String instrCn) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(rptId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateDrctMatter(instrCn,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }
}
