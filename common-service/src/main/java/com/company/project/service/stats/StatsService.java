package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;

/**
 * 통계 서비스 구현체
 * Native Query를 사용하여 기존 로그 테이블에서 통계를 집계
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService implements EgovStatsService {

    private final EntityManager entityManager;

    @Override
    public List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind) {
        // 접속 로그 테이블에서 일별/월별/년별 집계
        String dateFormat = getDateFormat(statsKind);
        String sql = """
                SELECT %s as stats_date, COUNT(*) as stats_co
                FROM COMTNLOGINLOG
                WHERE CREAT_DT BETWEEN :fromDate AND :toDate
                GROUP BY %s
                ORDER BY %s
                """.formatted(dateFormat, dateFormat, dateFormat);

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getBoardStats(String fromDate, String toDate, String statsKind) {
        // 게시글 테이블에서 일별/월별/년별 집계
        String dateFormat = getDateFormat(statsKind);
        String sql = """
                SELECT %s as stats_date, COUNT(*) as stats_co
                FROM NBOARD
                WHERE CREATED_AT BETWEEN :fromDate AND :toDate
                GROUP BY %s
                ORDER BY %s
                """.formatted(dateFormat, dateFormat, dateFormat);

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getUserStats(String fromDate, String toDate, String statsKind) {
        // 사용자 테이블에서 일별/월별/년별 가입자 집계
        String dateFormat = getDateFormat(statsKind);
        String sql = """
                SELECT %s as stats_date, COUNT(*) as stats_co
                FROM NUSER
                WHERE CREATED_AT BETWEEN :fromDate AND :toDate
                GROUP BY %s
                ORDER BY %s
                """.formatted(dateFormat, dateFormat, dateFormat);

        return executeStatsQuery(sql, fromDate, toDate);
    }

    @Override
    public List<StatsDto> getRequestStats(String fromDate, String toDate, String statsKind) {
        // 시스템 로그에서 요청 통계 집계
        String dateFormat = getDateFormat(statsKind);
        String sql = """
                SELECT %s as stats_date, COUNT(*) as stats_co
                FROM COMTNSYSHISTORY
                WHERE FRST_REGISTER_PNTTM BETWEEN :fromDate AND :toDate
                GROUP BY %s
                ORDER BY %s
                """.formatted(dateFormat, dateFormat, dateFormat);

        return executeStatsQuery(sql, fromDate, toDate);
    }

    private String getDateFormat(String statsKind) {
        // PostgreSQL 날짜 포맷
        return switch (statsKind) {
            case "year" -> "TO_CHAR(CREATED_AT, 'YYYY')";
            case "month" -> "TO_CHAR(CREATED_AT, 'YYYY-MM')";
            default -> "TO_CHAR(CREATED_AT, 'YYYY-MM-DD')"; // day
        };
    }

    @SuppressWarnings("unchecked")
    private List<StatsDto> executeStatsQuery(String sql, String fromDate, String toDate) {
        List<StatsDto> result = new ArrayList<>();

        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("fromDate", fromDate + " 00:00:00");
            query.setParameter("toDate", toDate + " 23:59:59");

            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                StatsDto dto = StatsDto.builder()
                        .statsDate((String) row[0])
                        .statsCo(((Number) row[1]).intValue())
                        .build();
                result.add(dto);
            }
        } catch (Exception e) {
            // 테이블이 없거나 쿼리 오류 시 빈 목록 반환
        }

        return result;
    }
}
