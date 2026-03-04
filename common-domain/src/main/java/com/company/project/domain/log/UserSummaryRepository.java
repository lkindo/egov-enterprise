package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSummaryRepository extends JpaRepository<UserSummary, UserSummaryId> {

    @Query(value = """
            SELECT SUM(USER_CO) AS statsCo,
                   CASE WHEN :pdKind = 'D' THEN SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
                        ELSE SUBSTR(OCCRRNC_DE, 1, 4)
                   END AS statsDate
              FROM SUSERSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR DETAIL_STATS_SE = :detailStatsKind)
             GROUP BY statsDate
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectUserStats(@Param("pdKind") String pdKind,
            @Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}