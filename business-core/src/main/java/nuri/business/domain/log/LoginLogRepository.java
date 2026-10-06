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
         * 일별 성공 로그인 통계. 실패(Y)와 결과 미상(NULL)은 로그인 이력에 남기되 집계에서 제외한다.
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
                           AND ERR_OCRN_YN = 'N'
                         GROUP BY SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 1, 4) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 5, 2) || '-' || SUBSTR(to_char(CRT_DT, 'YYYYMMDD'), 7, 2)
                         ORDER BY statsDate ASC
                        """, nativeQuery = true)
        java.util.List<Object[]> countLoginsByDate(
                        @org.springframework.data.repository.query.Param("fromDate") String fromDate,
                        @org.springframework.data.repository.query.Param("toDate") String toDate);
}
