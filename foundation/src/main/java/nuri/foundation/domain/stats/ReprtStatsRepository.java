package nuri.foundation.domain.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 보고서 통계 Repository
 */
@Repository
public interface ReprtStatsRepository extends JpaRepository<ReprtStats, String> {

    /**
     * 보고서 통계 목록 조회 (날짜 범위 조건)
     */
    @Query("""
            SELECT r FROM ReprtStats r
            WHERE (:reprtType IS NULL OR :reprtType = '' OR r.reprtType = :reprtType)
            AND r.crtDt BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            ORDER BY r.crtDt DESC
            """)
    Page<ReprtStats> findByConditions(
            @Param("reprtType") String reprtType,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            Pageable pageable);

    /**
     * 보고서 유형별 통계
     */
    @Query(value = """
            SELECT r.reprt_type as reprtType, COUNT(*) as cnt
            FROM tb_rptp_stats r
            WHERE r.crt_dt BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY r.reprt_type
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> countByReprtType(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 보고서 상태별 통계
     */
    @Query(value = """
            SELECT r.reprt_sttus as reprtSttus, COUNT(*) as cnt
            FROM tb_rptp_stats r
            WHERE r.crt_dt BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY r.reprt_sttus
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> countByReprtSttus(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 날짜별 보고서 수 통계
     */
    @Query(value = """
            SELECT TO_CHAR(r.crt_dt, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
            FROM tb_rptp_stats r
            WHERE r.crt_dt BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY TO_CHAR(r.crt_dt, 'YYYY-MM-DD')
            ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> countByDate(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 보고서 통계 건수 조회
     */
    @Query("""
            SELECT COUNT(r) FROM ReprtStats r
            WHERE (:reprtType IS NULL OR :reprtType = '' OR r.reprtType = :reprtType)
            AND r.crtDt BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            """)
    long countByConditions(
            @Param("reprtType") String reprtType,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
