package com.company.project.service.memoreport;

import com.company.project.domain.memoreport.MemoReport;
import com.company.project.domain.memoreport.MemoReportRepository;
import com.company.project.service.memoreport.dto.MemoReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 메모보고 서비스 구현체
 */
@Service("memoReportService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoReportService implements EgovMemoReportService {

    private final MemoReportRepository memoReportRepository;

    @Override
    public Page<MemoReportDto> getMemoReportList(String keyword, Pageable pageable) {
        return memoReportRepository.findByKeyword(keyword, pageable)
                .map(MemoReportDto::fromEntity);
    }

    @Override
    public Page<MemoReportDto> getMyReportList(String wrterId, Pageable pageable) {
        return memoReportRepository.findByWrterId(wrterId, pageable)
                .map(MemoReportDto::fromEntity);
    }

    @Override
    public Page<MemoReportDto> getReceivedReportList(String reportrId, Pageable pageable) {
        return memoReportRepository.findByReportrId(reportrId, pageable)
                .map(MemoReportDto::fromEntity);
    }

    @Override
    public MemoReportDto getMemoReport(String reprtId) {
        return memoReportRepository.findById(reprtId)
                .map(MemoReportDto::fromEntity)
                .orElse(null);
    }

    @Override
    @Transactional
    public String createMemoReport(String userId, MemoReportDto dto) {
        String id = "MEMOREPRT_" + System.currentTimeMillis();
        MemoReport entity = MemoReport.builder()
                .reprtId(id)
                .reprtSj(dto.getReprtSj())
                .reportDe(dto.getReportDe())
                .wrterId(userId)
                .reportrId(dto.getReportrId())
                .reportCn(dto.getReportCn())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .frstRegistPnttm(LocalDateTime.now())
                .build();
        memoReportRepository.save(entity);
        return id;
    }

    @Override
    @Transactional
    public void updateMemoReport(String reprtId, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(reprtId)
                .orElseThrow(() -> new IllegalArgumentException("MemoReport not found: " + reprtId));

        MemoReport updated = MemoReport.builder()
                .reprtId(entity.getReprtId())
                .reprtSj(dto.getReprtSj())
                .reportDe(dto.getReportDe())
                .wrterId(entity.getWrterId())
                .reportrId(dto.getReportrId())
                .reportCn(dto.getReportCn())
                .atchFileId(dto.getAtchFileId())
                .drctMatter(dto.getDrctMatter()) // 지시사항 업데이트 등
                .drctMatterRegistDt(dto.getDrctMatterRegistDt())
                .reportrInqireDt(dto.getReportrInqireDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        memoReportRepository.save(updated);
    }

    @Override
    @Transactional
    public void deleteMemoReport(String reprtId) {
        memoReportRepository.deleteById(reprtId);
    }
}
