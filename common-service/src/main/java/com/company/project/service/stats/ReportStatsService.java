package com.company.project.service.stats;

import com.company.project.domain.stats.DtaUseStats;
import com.company.project.domain.stats.DtaUseStatsRepository;
import com.company.project.domain.stats.ReprtStats;
import com.company.project.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 보고서통계 및 자료이용현황통계 JPA 서비스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportStatsService {

    private final ReprtStatsRepository reprtStatsRepository;
    private final DtaUseStatsRepository dtaUseStatsRepository;

    // ========== 보고서 통계 ==========

    /**
     * 보고서 통계 목록 조회
     */
    public Page<ReprtStats> getReprtStatsList(String reprtTy, String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.findByConditions(reprtTy, from, to, PageRequest.of(page, size));
    }

    /**
     * 보고서 통계 전체 건수
     */
    public long getReprtStatsCount(String reprtTy, String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByConditions(reprtTy, from, to);
    }

    /**
     * 등록일별 보고서 통계
     */
    public List<Object[]> getReprtStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByDate(from, to);
    }

    /**
     * 보고서 유형별 통계
     */
    public List<Object[]> getReprtStatsByType(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtTy(from, to);
    }

    /**
     * 보고서 상태별 통계
     */
    public List<Object[]> getReprtStatsByStatus(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtSttus(from, to);
    }

    // ========== 자료이용현황 통계 ==========

    /**
     * 자료이용현황 통계 목록 조회
     */
    public Page<DtaUseStats> getDtaUseStatsList(String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.findByDateRange(from, to, PageRequest.of(page, size));
    }

    /**
     * 자료이용현황 통계 전체 건수
     */
    public long getDtaUseStatsCount(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDateRange(from, to);
    }

    /**
     * 등록일별 자료이용현황 통계
     */
    public List<Object[]> getDtaUseStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDate(from, to);
    }

    /**
     * 게시판별 자료이용현황 통계
     */
    public List<Object[]> getDtaUseStatsByBbs(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByBbsId(from, to);
    }
}
