package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 통계 서비스 구현체
 */
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
            // Log error if needed
        }

        return result;
    }
}