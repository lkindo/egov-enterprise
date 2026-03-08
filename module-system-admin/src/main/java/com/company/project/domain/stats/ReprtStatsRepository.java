package com.company.project.domain.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 癰귣떯???????Repository
 */
@Repository
public interface ReprtStatsRepository extends JpaRepository<ReprtStats, String> {

    /**
     * 癰귣떯???????筌뤴뫖以?鈺곌퀬??(??륁뵠筌?
     */
    @Query("""
            SELECT r FROM ReprtStats r
            WHERE (:reprtTy IS NULL OR :reprtTy = '' OR r.reprtTy = :reprtTy)
            AND r.frstRegistPnttm BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            ORDER BY r.frstRegistPnttm DESC
            """)
    Page<ReprtStats> findByConditions(
            @Param("reprtTy") String reprtTy,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            Pageable pageable);

    /**
     * 癰귣떯????醫륁굨癰?????
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
     * 癰귣떯????怨밴묶癰?????
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
     * ?源낆쨯??고?????
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
     * ?袁⑷퍥 椰꾨똻??
     */
    @Query("""
            SELECT COUNT(r) FROM ReprtStats r
            WHERE (:reprtTy IS NULL OR :reprtTy = '' OR r.reprtTy = :reprtTy)
            AND r.frstRegistPnttm BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
                AND CAST(:toDate AS java.time.LocalDateTime)
            """)
    long countByConditions(
            @Param("reprtTy") String reprtTy,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}
