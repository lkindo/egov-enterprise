package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BbsSummaryRepository extends JpaRepository<BbsSummary, BbsSummaryId> {

    @Query(value = """
            SELECT SUM(CREAT_CO) AS statsCo,
                   CASE WHEN :pdKind = 'Y' THEN SUBSTR(OCCRRNC_DE, 1, 4)
                        WHEN :pdKind = 'M' THEN SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2)
                        ELSE SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
                   END AS statsDate
              FROM SBBSSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR DETAIL_STATS_SE = :detailStatsKind)
             GROUP BY statsDate
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsCretCntStats(@Param("pdKind") String pdKind,
            @Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    @Query(value = """
            SELECT SUM(TOT_RDCNT) AS statsCo,
                   CASE WHEN :pdKind = 'Y' THEN SUBSTR(OCCRRNC_DE, 1, 4)
                        WHEN :pdKind = 'M' THEN SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2)
                        ELSE SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
                   END AS statsDate
              FROM SBBSSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR DETAIL_STATS_SE = :detailStatsKind)
             GROUP BY statsDate
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsTotCntStats(@Param("pdKind") String pdKind,
            @Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    @Query(value = """
            SELECT COALESCE(SUM(TOT_RDCNT) / NULLIF(SUM(CREAT_CO), 0), 0) AS avrgInqireCo,
                   CASE WHEN :pdKind = 'Y' THEN SUBSTR(OCCRRNC_DE, 1, 4)
                        WHEN :pdKind = 'M' THEN SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2)
                        ELSE SUBSTR(OCCRRNC_DE, 1, 4) || '-' || SUBSTR(OCCRRNC_DE, 5, 2) || '-' || SUBSTR(OCCRRNC_DE, 7, 2)
                   END AS statsDate
              FROM SBBSSUMMARY
             WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR DETAIL_STATS_SE = :detailStatsKind)
             GROUP BY statsDate
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsAvgCntStats(@Param("pdKind") String pdKind,
            @Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    @Query(value = """
            SELECT a.OCCRRNC_DE AS statsDate,
                   a.TOP_INQIRE_BBSCTT_ID AS mxmmInqireBbsId,
                   b.NTT_SJ AS mxmmInqireBbsNm,
                   b.RDCNT AS maxStatsCo
              FROM SBBSSUMMARY a, NBBS b
             WHERE a.OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND a.STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR a.DETAIL_STATS_SE = :detailStatsKind)
               AND a.TOP_INQIRE_BBSCTT_ID = CAST(b.NTT_ID AS VARCHAR)
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsMaxCntStats(@Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    @Query(value = """
            SELECT a.OCCRRNC_DE AS statsDate,
                   a.MUMM_INQIRE_BBSCTT_ID AS mummInqireBbsId,
                   b.NTT_SJ AS mummInqireBbsNm,
                   b.RDCNT AS minStatsCo
              FROM SBBSSUMMARY a, NBBS b
             WHERE a.OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND a.STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR a.DETAIL_STATS_SE = :detailStatsKind)
               AND a.MUMM_INQIRE_BBSCTT_ID = CAST(b.NTT_ID AS VARCHAR)
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsMinCntStats(@Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    @Query(value = """
            SELECT a.OCCRRNC_DE AS statsDate,
                   a.TOP_NTCR_ID AS topNtcepersonId,
                   COUNT(b.NTT_ID) AS topNtcepersonCo
              FROM SBBSSUMMARY a, NBBS b
             WHERE a.OCCRRNC_DE BETWEEN :fromDate AND :toDate
               AND a.STATS_SE = :statsKind
               AND (:detailStatsKind IS NULL OR :detailStatsKind = '' OR a.DETAIL_STATS_SE = :detailStatsKind)
               AND a.TOP_NTCR_ID IS NOT NULL
               AND b.NTCR_ID = a.TOP_NTCR_ID
               AND b.NTCR_ID IS NOT NULL
             GROUP BY statsDate, topNtcepersonId
             ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> selectBbsMaxUserStats(@Param("statsKind") String statsKind,
            @Param("detailStatsKind") String detailStatsKind,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
