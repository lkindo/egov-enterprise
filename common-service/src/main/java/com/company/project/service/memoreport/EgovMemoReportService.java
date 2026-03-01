package com.company.project.service.memoreport;

import com.company.project.service.memoreport.dto.MemoReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 硫붾?�蹂?��???�퉬???명꽣??�씠??
 */
public interface EgovMemoReportService {

    Page<MemoReportDto> getMemoReportList(String keyword, Pageable pageable);

    Page<MemoReportDto> getMyReportList(String wrterId, Pageable pageable);

    Page<MemoReportDto> getReceivedReportList(String reportrId, Pageable pageable);

    MemoReportDto getMemoReport(String reprtId);

    String createMemoReport(String userId, MemoReportDto dto);

    void updateMemoReport(String reprtId, String userId, MemoReportDto dto);

    void deleteMemoReport(String reprtId);

    void readMemoReport(String reprtId);

    void updateDrctMatter(String reprtId, String drctMatter);
}
