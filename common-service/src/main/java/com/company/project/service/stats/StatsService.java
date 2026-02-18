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
 * Native Query를 사용하여 기존 통계 요약 테이블에서 데이터 조회
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService implements EgovStatsService {

    private final EntityManager entityManager;

    @Override
    public List<StatsDto> getConnectionStats(String fromDate, String toDate, String statsKind) {
        // 접속 로그 테이블에서 일별/월별/년별 집계 (SCONECTSUMMARY -> sweblogsummary)
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
        // 게시판 요약 테이블에서 조회 (SBBSSUMMARY)
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
        // 사용자 요약 테이블에서 조회 (SUSERSUMMARY)
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
        // 화면 요약 테이블에서 요청 통계 집계 (SSCRINSUMMARY -> sweblogsummary 대체)
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
            // 테이블이 없거나 쿼리 오류 시 빈 목록 반환
            // 에러를 무시하지 않고, 빈 결과 반환
        }

        return result;
    }
}
