package com.company.project.service.memoreport;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.memoreport.MemoReport;
import com.company.project.domain.memoreport.MemoReportRepository;
import com.company.project.service.memoreport.dto.MemoReportDto;
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
        // Basic find all or search could be implemented with QueryDSL if complex
        return memoReportRepository.findAll(pageable).map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getMyReportList(String wrterId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return memoReportRepository.findByWrterId(Objects.requireNonNull(wrterId), pageable).map(MemoReportDto::from);
    }

    @Override
    public Page<MemoReportDto> getReceivedReportList(String reportrId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return memoReportRepository.findByReportrId(Objects.requireNonNull(reportrId), pageable)
                .map(MemoReportDto::from);
    }

    @Override
    public MemoReportDto getMemoReport(String reprtId) {
        return memoReportRepository.findById(Objects.requireNonNull(reprtId))
                .map(MemoReportDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createMemoReport(String userId, MemoReportDto dto) {
        String id = "MRM_" + String.format("%013d", System.currentTimeMillis());
        MemoReport entity = MemoReport.builder()
                .reprtId(id)
                .reprtSj(dto.getReprtSj())
                .reportDe(dto.getReportDe())
                .wrterId(userId)
                .reportrId(dto.getReportrId())
                .reportCn(dto.getReportCn())
                .atchFileId(dto.getAtchFileId())
                .build();
        memoReportRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateMemoReport(String reprtId, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(reprtId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getReprtSj(), dto.getReportDe(), userId, dto.getReportrId(),
                dto.getReportCn(), dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteMemoReport(String reprtId) {
        memoReportRepository.deleteById(Objects.requireNonNull(reprtId));
    }

    @Override
    @Transactional
    public void readMemoReport(String reprtId) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(reprtId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateInqireDt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }

    @Override
    @Transactional
    public void updateDrctMatter(String reprtId, String drctMatter) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(reprtId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateDrctMatter(drctMatter,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }
}