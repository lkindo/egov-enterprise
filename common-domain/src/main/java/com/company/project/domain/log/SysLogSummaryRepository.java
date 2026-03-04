package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SysLogSummaryRepository extends JpaRepository<SysLogSummary, SysLogSummaryId> {

    /**
     * ??뺥돩??삵?????鈺곌퀬??(?袁⑤즲癰?筌욌쵌??
     */
    @Query(value = """
            SELECT METHOD_NM AS conectMethod,
                   NVL(SUM(CREAT_CO),0) AS creatCo,
                   NVL(SUM(UPDT_CO),0) AS updtCo,
                   NVL(SUM(RDCNT),0) AS inqireCo,
                   NVL(SUM(DELETE_CO),0) AS deleteCo,
                   NVL(SUM(OUTPT_CO),0) AS outptCo,
                   NVL(SUM(ERROR_CO),0) AS errorCo,
                   SUBSTR(OCCRRNC_DE, 1, 4) AS statsDate,
                   0 AS statsCo
              FROM SSYSLOGSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR SRVC_NM LIKE '%' || :detailStatsKind || '%')
             GROUP BY METHOD_NM, SUBSTR(OCCRRNC_DE, 1, 4)
             ORDER BY SUBSTR(OCCRRNC_DE, 1, 4)
            """, nativeQuery = true)
    List<Object[]> selectServiceStatsByYear(@Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("detailStatsKind") String detailStatsKind);

    /**
     * ??뺥돩??삵?????鈺곌퀬??(?遺얩?筌욌쵌??
     */
    @Query(value = """
            SELECT METHOD_NM AS conectMethod,
                   NVL(SUM(CREAT_CO),0) AS creatCo,
                   NVL(SUM(UPDT_CO),0) AS updtCo,
                   NVL(SUM(RDCNT),0) AS inqireCo,
                   NVL(SUM(DELETE_CO),0) AS deleteCo,
                   NVL(SUM(OUTPT_CO),0) AS outptCo,
                   NVL(SUM(ERROR_CO),0) AS errorCo,
                   SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) AS statsDate,
                   0 AS statsCo
              FROM SSYSLOGSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR SRVC_NM LIKE '%' || :detailStatsKind || '%')
             GROUP BY METHOD_NM, SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2)
             ORDER BY SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2)
            """, nativeQuery = true)
    List<Object[]> selectServiceStatsByMonth(@Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("detailStatsKind") String detailStatsKind);

    /**
     * ??뺥돩??삵?????鈺곌퀬??(??고?筌욌쵌??
     */
    @Query(value = """
            SELECT METHOD_NM AS conectMethod,
                   NVL(SUM(CREAT_CO),0) AS creatCo,
                   NVL(SUM(UPDT_CO),0) AS updtCo,
                   NVL(SUM(RDCNT),0) AS inqireCo,
                   NVL(SUM(DELETE_CO),0) AS deleteCo,
                   NVL(SUM(OUTPT_CO),0) AS outptCo,
                   NVL(SUM(ERROR_CO),0) AS errorCo,
                   SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2) AS statsDate,
                   0 AS statsCo
              FROM SSYSLOGSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR SRVC_NM LIKE '%' || :detailStatsKind || '%')
             GROUP BY METHOD_NM, SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
             ORDER BY SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
            """, nativeQuery = true)
    List<Object[]> selectServiceStatsByDay(@Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("detailStatsKind") String detailStatsKind);
}