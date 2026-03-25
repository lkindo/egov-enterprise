package com.company.project.foundation.service.stats;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.service.stats.dto.StatsDto;
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
