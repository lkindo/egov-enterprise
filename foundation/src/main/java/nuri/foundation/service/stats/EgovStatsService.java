package nuri.foundation.service.stats;

import nuri.foundation.service.stats.dto.StatsDto;
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

    /**
     * 요약 통계 조회
     */
    java.util.Map<String, Object> getSummary();

    /**
     * 메뉴별 통계 조회
     */
    List<java.util.Map<String, Object>> getMenuStats();
}
