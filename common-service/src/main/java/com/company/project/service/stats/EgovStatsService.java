package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;

import java.util.List;

/**
 * ?듦퀎 ?쒕퉬???명꽣?섏씠??
 */
public interface EgovStatsService {

    /**
     * ?묒냽 ?듦퀎 議고쉶
     */
    List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind);

    /**
     * 寃뚯떆臾??듦퀎 議고쉶
     */
    List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind);

    /**
     * ?ъ슜???듦퀎 議고쉶
     */
    List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind);

    /**
     * ?붿껌 ?듦퀎 議고쉶
     */
    List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind);
}
