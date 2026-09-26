package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 로그인로그 JPA Repository
 */
@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long>, LoginLogRepositoryCustom {
        java.util.List<LoginLog> findTop100ByOrderByCrtDtDesc();

        /**
         * 개인별 통계 (연도별)
         */
        @org.springframework.data.jpa.repository.Query(value = """
                        SELECT COUNT(LOGIN_ID) AS statsCo,
                               SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) AS statsDate,
                               '' AS conectMethod,
                               0 AS creatCo, 0 AS updtCo, 0 AS inqCnt, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
                          FROM TB_LOGIN_LOG
                         WHERE LOGIN_ID = :detailStatsKind
                           AND to_char(CRT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
                         GROUP BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4)
                         ORDER BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4)
                        """, nativeQuery = true)
        java.util.List<Object[]> selectPersonalStatsByYear(
                        @org.springframework.data.repository.query.Param("fromDate") String fromDate,
                        @org.springframework.data.repository.query.Param("toDate") String toDate,
                        @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);

        /**
         * 개인별 통계 (월별)
         */
        @org.springframework.data.jpa.repository.Query(value = """
                        SELECT COUNT(LOGIN_ID) AS statsCo,
                               SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) AS statsDate,
                               '' AS conectMethod,
                               0 AS creatCo, 0 AS updtCo, 0 AS inqCnt, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
                          FROM TB_LOGIN_LOG
                         WHERE LOGIN_ID = :detailStatsKind
                           AND to_char(CRT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
                         GROUP BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2)
                         ORDER BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2)
                        """, nativeQuery = true)
        java.util.List<Object[]> selectPersonalStatsByMonth(
                        @org.springframework.data.repository.query.Param("fromDate") String fromDate,
                        @org.springframework.data.repository.query.Param("toDate") String toDate,
                        @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);

        /**
         * 개인별 통계 (일별)
         */
        @org.springframework.data.jpa.repository.Query(value = """
                        SELECT COUNT(LOGIN_ID) AS statsCo,
                               SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2) AS statsDate,
                               '' AS conectMethod,
                               0 AS creatCo, 0 AS updtCo, 0 AS inqCnt, 0 AS deleteCo, 0 AS outptCo, 0 AS errorCo
                          FROM TB_LOGIN_LOG
                         WHERE LOGIN_ID = :detailStatsKind
                           AND to_char(CRT_DT, 'YYYYMMDD') BETWEEN :fromDate AND :toDate
                         GROUP BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2)
                         ORDER BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2)
                        """, nativeQuery = true)
        java.util.List<Object[]> selectPersonalStatsByDay(
                        @org.springframework.data.repository.query.Param("fromDate") String fromDate,
                        @org.springframework.data.repository.query.Param("toDate") String toDate,
                        @org.springframework.data.repository.query.Param("detailStatsKind") String detailStatsKind);

        /**
         * 일별 전체 로그인/접속 통계.
         *
         * <p>[2026-09-26 DIP B5 F10] 기간은 {@code CRT_DT} 범위로 거른다 — 종전의 {@code to_char(CRT_DT) BETWEEN} 은
         * 컬럼을 문자열로 바꾼 뒤 비교해 {@code ix_tb_login_log_crt_dt}(V2_97)를 쓸 수 없었다. 종료일은 그날 끝까지다.
         */
        @org.springframework.data.jpa.repository.Query(value = """
                        SELECT SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2) AS statsDate,
                               COUNT(LGN_SN) AS statsCo
                          FROM TB_LOGIN_LOG
                         WHERE CRT_DT >= to_date(:fromDate, 'YYYYMMDD')
                           AND CRT_DT < to_date(:toDate, 'YYYYMMDD') + INTERVAL '1' DAY
                         GROUP BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2)
                         ORDER BY statsDate ASC
                        """, nativeQuery = true)
        java.util.List<Object[]> countLoginsByDate(
                        @org.springframework.data.repository.query.Param("fromDate") String fromDate,
                        @org.springframework.data.repository.query.Param("toDate") String toDate);
}
