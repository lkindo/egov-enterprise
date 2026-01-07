package com.company.project.domain.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 자료이용현황 통계 Repository
 */
@Repository
public interface DtaUseStatsRepository extends JpaRepository<DtaUseStats, String> {

    /**
     * 자료이용현황 통계 목록 조회 (페이징)
     */
    @Query("""
            SELECT d FROM DtaUseStats d
            WHERE d.frstRegistPnttm BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            ORDER BY d.frstRegistPnttm DESC
            """)
    Page<DtaUseStats> findByDateRange(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            Pageable pageable);

    /**
     * 등록일별 통계
     */
    @Query(value = """
            SELECT TO_CHAR(d.frst_regist_pnttm, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
            FROM ndtausestats d
            WHERE d.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY TO_CHAR(d.frst_regist_pnttm, 'YYYY-MM-DD')
            ORDER BY statsDate
            """, nativeQuery = true)
    List<Object[]> countByDate(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 전체 건수
     */
    @Query("""
            SELECT COUNT(d) FROM DtaUseStats d
            WHERE d.frstRegistPnttm BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            """)
    long countByDateRange(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * 게시판별 자료이용 통계
     */
    @Query(value = """
            SELECT d.bbs_id as bbsId, COUNT(*) as cnt
            FROM ndtausestats d
            WHERE d.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
            GROUP BY d.bbs_id
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> countByBbsId(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
