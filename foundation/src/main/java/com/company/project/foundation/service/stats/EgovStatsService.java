package com.company.project.foundation.service.stats;

import com.company.project.foundation.service.stats.dto.StatsDto;
import java.util.List;

/**
 * ??????퉬???명꽣??씠??
 */
public interface EgovStatsService {

    /**
     * ?묒냽 議고??     */
    List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind);

    /**
     * 寃뚯臾議고??     */
    List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind);

    /**
     * 議고??     */
    List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind);

    /**
     * ?붿껌 議고??     */
    List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind);
}
