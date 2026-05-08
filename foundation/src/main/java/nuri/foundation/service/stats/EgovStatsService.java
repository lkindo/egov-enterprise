package nuri.foundation.service.stats;

import nuri.foundation.service.stats.dto.StatsDto;
import java.util.List;

/**
 * 통계 서비스 인터페이스
 */
public interface EgovStatsService {

    /**
     * 접속 통계 조회
     */
    List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind);

    /**
     * 게시물 통계 조회
     */
    List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind);

    /**
     * 사용자 통계 조회
     */
    List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind);

    /**
     * 요청 통계 조회
     */
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
