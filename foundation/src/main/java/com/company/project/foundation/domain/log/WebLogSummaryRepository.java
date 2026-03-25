package com.company.project.foundation.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WebLogSummaryRepository extends JpaRepository<WebLogSummary, WebLogSummaryId> {

    @Query(value = """
            SELECT COALESCE(SUM(a.RDCNT), 0) AS statsCo,
                   CASE WHEN :pdKind = 'Y' THEN SUBSTR(a.OCCRRNC_DE, 1, 4)
                        WHEN :pdKind = 'M' THEN SUBSTR(a.OCCRRNC_DE, 1, 4) || '-' || SUBSTR(a.OCCRRNC_DE, 5, 2)
                        ELSE SUBSTR(a.OCCRRNC_DE, 1, 4) || '-' || SUBSTR(a.OCCRRNC_DE, 5, 2) || '-' || SUBSTR(a.OCCRRNC_DE, 7, 2)
                   END AS statsDate
              FROM SWEBLOGSUMMARY a,
                   (SELECT PROGRM_STRE_PATH AS URL
                      FROM NPROGRMLIST
                     WHERE PROGRM_FILE_NM = :detailStatsKind) b
             WHERE a.OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND POSITION(b.URL IN a.URL) > 0
             GROUP BY statsDate
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectScrinStats(@Param("pdKind") String pdKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
