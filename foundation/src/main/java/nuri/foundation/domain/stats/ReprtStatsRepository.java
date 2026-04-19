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
            WHERE (:reprtTy IS NULL OR :reprtTy = '' OR r.reprtTy = :reprtTy)
            AND r.createdDate BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            ORDER BY r.createdDate DESC
            """)
    Page<ReprtStats> findByConditions(
            @Param("reprtTy") String reprtTy,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            Pageable pageable);

    /**
     * 보고서 유형별 통계
     */
    @Query(value = """
            SELECT r.reprt_ty as reprtTy, COUNT(*) as cnt
            FROM nreprtstats r
            WHERE r.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY r.reprt_ty
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> countByReprtTy(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 보고서 상태별 통계
     */
    @Query(value = """
            SELECT r.reprt_sttus as reprtSttus, COUNT(*) as cnt
            FROM nreprtstats r
            WHERE r.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
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
            SELECT TO_CHAR(r.frst_regist_pnttm, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
            FROM nreprtstats r
            WHERE r.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY TO_CHAR(r.frst_regist_pnttm, 'YYYY-MM-DD')
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
            WHERE (:reprtTy IS NULL OR :reprtTy = '' OR r.reprtTy = :reprtTy)
            AND r.createdDate BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            """)
    long countByConditions(
            @Param("reprtTy") String reprtTy,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
