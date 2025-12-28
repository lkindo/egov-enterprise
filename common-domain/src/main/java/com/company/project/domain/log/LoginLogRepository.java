package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 로그인 로그 JPA Repository
 */
@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, String>, LoginLogRepositoryCustom {
    java.util.List<LoginLog> findTop100ByOrderByCreatDtDesc();

    /**
     * 개인별 통계 조회 (년도별 집계)
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT COUNT(CONECT_ID) AS statsCo,
                   SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) AS statsDate,
                   '' AS conectMethod,
                   0 AS creatCo, 0 AS updtCo, 0 AS inqireCo, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
              FROM NLOGINLOG
             WHERE CONECT_ID = :detailStatsKind
               AND to_char(CREAT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
             GROUP BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4)
             ORDER BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4)
            """, nativeQuery = true)
    java.util.List<Object[]> selectPersonalStatsByYear(
            @org.springframework.data.repository.query.Param("fromDate") String fromDate,
            @org.springframework.data.repository.query.Param("toDate") String toDate,
            @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);

    /**
     * 개인별 통계 조회 (월별 집계)
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT COUNT(CONECT_ID) AS statsCo,
                   SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2) AS statsDate,
                   '' AS conectMethod,
                   0 AS creatCo, 0 AS updtCo, 0 AS inqireCo, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
              FROM NLOGINLOG
             WHERE CONECT_ID = :detailStatsKind
               AND to_char(CREAT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
             GROUP BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2)
             ORDER BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2)
            """, nativeQuery = true)
    java.util.List<Object[]> selectPersonalStatsByMonth(
            @org.springframework.data.repository.query.Param("fromDate") String fromDate,
            @org.springframework.data.repository.query.Param("toDate") String toDate,
            @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);

    /**
     * 개인별 통계 조회 (일별 집계)
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT COUNT(CONECT_ID) AS statsCo,
                   SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 7, 2) AS statsDate,
                   '' AS conectMethod,
                   0 AS creatCo, 0 AS updtCo, 0 AS inqireCo, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
              FROM NLOGINLOG
             WHERE CONECT_ID = :detailStatsKind
               AND to_char(CREAT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
             GROUP BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 7, 2)
             ORDER BY SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CREAT_DT, 'YYYYMMDD'), 7, 2)
            """, nativeQuery = true)
    java.util.List<Object[]> selectPersonalStatsByDay(
            @org.springframework.data.repository.query.Param("fromDate") String fromDate,
            @org.springframework.data.repository.query.Param("toDate") String toDate,
            @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);
}
