package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;

import java.util.List;

/**
 * ??????퉬???명꽣??씠??
 */
public interface EgovStatsService {

    /**
     * ?묒냽 ????議고??     */
    List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind);

    /**
     * 寃뚯?臾?????議고??     */
    List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind);

    /**
     * ?????????議고??     */
    List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind);

    /**
     * ?붿껌 ????議고??     */
    List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind);
}