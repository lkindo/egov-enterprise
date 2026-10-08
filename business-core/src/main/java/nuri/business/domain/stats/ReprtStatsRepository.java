package nuri.business.domain.stats;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 보고서 통계 Repository. 날짜 범위는 [fromDate, toDate)인 반개방 구간이다.
 *
 * <p>[2026-09-25] 호출처가 없던 목록·건수·유형별·상태별 조회를 걷었다.
 */
@Repository
public interface ReprtStatsRepository extends JpaRepository<ReprtStats, Long> {

    /**
     * 날짜별 보고서 수 통계
     */
    @Query(value = """
            SELECT TO_CHAR(r.crt_dt, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
            FROM tb_rptp_stats r
            WHERE r.crt_dt >= CAST(:fromDate AS TIMESTAMP) AND r.crt_dt < CAST(:toDate AS TIMESTAMP)
            GROUP BY TO_CHAR(r.crt_dt, 'YYYY-MM-DD')
            ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> countByDate(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
