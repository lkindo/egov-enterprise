package nuri.business.domain.log;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
         * <p>[2026-09-26 DIP B5 F10] 기간은 {@code crt_dt} 범위로 거른다 — 컬럼을 문자열로 바꾼 뒤 비교하면
         * {@code ix_tb_login_log_crt_dt}(V2_97)를 쓸 수 없다. 종료일은 그날 끝까지다.
         */
        default java.util.List<Object[]> countLoginsByDate(String fromDate, String toDate) {
                return countLoginsInRange(LocalDate.parse(fromDate, DateTimeFormatter.BASIC_ISO_DATE).atStartOfDay(),
                                LocalDate.parse(toDate, DateTimeFormatter.BASIC_ISO_DATE).plusDays(1).atStartOfDay());
        }

        /** 반개방 구간 [from, to) 의 일별 성공 로그인 수. 일자 형식은 Hibernate 가 벤더 함수로 만든다. */
        @org.springframework.data.jpa.repository.Query("""
                        SELECT format(l.crtDt as 'yyyy-MM-dd') AS statsDate, COUNT(l.lgnSn) AS statsCo
                          FROM LoginLog l
                         WHERE l.crtDt >= :from
                           AND l.crtDt < :to
                           AND l.errOcrnYn = 'N'
                         GROUP BY format(l.crtDt as 'yyyy-MM-dd')
                         ORDER BY statsDate ASC
                        """)
        java.util.List<Object[]> countLoginsInRange(
                        @org.springframework.data.repository.query.Param("from") LocalDateTime from,
                        @org.springframework.data.repository.query.Param("to") LocalDateTime to);
}
