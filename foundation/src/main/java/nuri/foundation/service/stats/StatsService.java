package nuri.foundation.service.stats;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.service.stats.dto.StatsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 통계 서비스 구현체
 * - Native Query를 사용하여 일자별 요약 통계 정보 제공
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService implements EgovStatsService {

    private final EntityManager entityManager;

    @Override
    public List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind) {
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(rdcnt) as stats_co
                FROM sweblogsummary
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind) {
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(CREAT_CO) as stats_co
                FROM SBBSSUMMARY
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind) {
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(user_co) as stats_co
                FROM SUSERSUMMARY
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind) {
        String sql = """
                SELECT OCCRRNC_DE as stats_date, SUM(rdcnt) as stats_co
                FROM sweblogsummary
                WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
                GROUP BY OCCRRNC_DE
                ORDER BY OCCRRNC_DE
                """;

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public java.util.Map<String, Object> getSummary() {
        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        try {
            summary.put("userCount", ((Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM COMTNGNRLMBER").getSingleResult()).longValue());
            summary.put("bbsCount", ((Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM COMTNBBSMASTER").getSingleResult()).longValue());
            summary.put("menuCount", ((Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM COMTNMENUINFO").getSingleResult()).longValue());
            summary.put("todayVisit", ((Number) entityManager.createNativeQuery("SELECT COALESCE(SUM(rdcnt), 0) FROM sweblogsummary WHERE OCCRRNC_DE = CURRENT_DATE").getSingleResult()).longValue());
        } catch (Exception e) {
            log.warn(">>> Error fetching summary stats: {}", e.getMessage());
        }
        return summary;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<java.util.Map<String, Object>> getMenuStats() {
        List<java.util.Map<String, Object>> result = new ArrayList<>();
        try {
            String sql = """
                    SELECT m.MENU_NM, COUNT(*) as visit_count
                    FROM COMTNWEBLOG l
                    JOIN COMTNMENUINFO m ON l.URL LIKE CONCAT('%', m.PROGRM_FILE_NM, '%')
                    GROUP BY m.MENU_NM
                    ORDER BY visit_count DESC
                    LIMIT 10
                    """;
            List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
            for (Object[] row : rows) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("menuNm", row[0]);
                map.put("visitCount", row[1]);
                result.add(map);
            }
        } catch (Exception e) {
            log.warn(">>> Error fetching menu stats: {}", e.getMessage());
        }
        return result;
    }

    /**
     * 통계 쿼리 실행 및 DTO 매핑
     */
    @SuppressWarnings("unchecked")
    private List<StatsDto> executeStatsQuery(String sql, String fromDate, String toDate) {
        List<StatsDto> result = new ArrayList<>();

        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("fromDate", fromDate);
            query.setParameter("toDate", toDate);

            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                StatsDto dto = StatsDto.builder()
                        .statsDate((String) Objects.requireNonNull(row[0]))
                        .statsCo(((Number) Objects.requireNonNull(row[1])).intValue())
                        .build();
                result.add(dto);
            }
        } catch (Exception e) {
            log.error(">>> Error executing stats query: from={}, to={}, error={}", fromDate, toDate, e.getMessage());
            throw new BusinessException("통계 정보를 조회하는 중 오류가 발생했습니다.", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        return result;
    }
}
