package nuri.foundation.domain.stats;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DtaUseStatsRepository extends JpaRepository<DtaUseStats, String> {

  @Query(value = """
      SELECT COUNT(*) AS statsCo,
             CASE WHEN :pdKind = 'Y' THEN TO_CHAR(A.FRST_REGIST_PNTTM, 'YYYY')
                  WHEN :pdKind = 'M' THEN TO_CHAR(A.FRST_REGIST_PNTTM, 'YYYY-MM')
                  ELSE TO_CHAR(A.FRST_REGIST_PNTTM, 'YYYY-MM-DD')
             END AS statsDate
        FROM NDTAUSESTATS A
       WHERE A.FRST_REGIST_PNTTM BETWEEN :fromDate AND :toDate
       GROUP BY statsDate
       ORDER BY statsDate DESC
      """, nativeQuery = true)
  List<Object[]> selectDtaUseStatsBarList(@Param("pdKind") String pdKind,
      @Param("fromDate") LocalDateTime fromDate,
      @Param("toDate") LocalDateTime toDate);

  @Query(value = """
      SELECT A.BBS_ID, B.BBS_NM, A.NTT_ID, C.NTT_SJ, A.ATCH_FILE_ID, A.FILE_SN, D.ORIGNL_FILE_NM, COUNT(*) AS statsCo
        FROM NDTAUSESTATS A
        JOIN NBBSMASTER B ON A.BBS_ID = B.BBS_ID
        JOIN NBBS C ON A.BBS_ID = C.BBS_ID AND A.NTT_ID = C.NTT_ID
        JOIN NFILEDETAIL D ON A.ATCH_FILE_ID = D.ATCH_FILE_ID AND A.FILE_SN = D.FILE_SN
       WHERE A.FRST_REGIST_PNTTM BETWEEN :fromDate AND :toDate
         AND (:searchKeyword IS NULL OR :searchKeyword = '' OR B.BBS_NM LIKE '%' || :searchKeyword || '%')
       GROUP BY A.BBS_ID, B.BBS_NM, A.NTT_ID, C.NTT_SJ, A.ATCH_FILE_ID, A.FILE_SN, D.ORIGNL_FILE_NM
       ORDER BY statsCo DESC
      """, nativeQuery = true)
  List<Object[]> selectDtaUseStatsList(@Param("fromDate") LocalDateTime fromDate,
      @Param("toDate") LocalDateTime toDate,
      @Param("searchKeyword") String searchKeyword);

  @Query("""
      SELECT d FROM DtaUseStats d
      WHERE d.bbsId = :bbsId AND d.nttId = :nttId AND d.atchFileId = :atchFileId AND d.fileSn = :fileSn
      ORDER BY d.createdDate DESC
      """)
  Page<DtaUseStats> selectDtaUseStatsDetail(@Param("bbsId") String bbsId,
      @Param("nttId") Long nttId,
      @Param("atchFileId") String atchFileId,
      @Param("fileSn") Integer fileSn,
      Pageable pageable);

  /**
   * 癒┷곸뒠袁れ넺 筌뤴뫖以鈺곌퀬??
   */
  @Query("""
      SELECT d FROM DtaUseStats d
      WHERE d.createdDate BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
          AND CAST(:toDate AS java.time.LocalDateTime)
      ORDER BY d.createdDate DESC
      """)
  Page<DtaUseStats> findByDateRange(
      @Param("fromDate") String fromDate,
      @Param("toDate") String toDate,
      Pageable pageable);

  /**
   * 癒┷곸뒠袁れ넺 袁⑷퍥 椰꾨똻??
   */
  @Query("""
      SELECT COUNT(d) FROM DtaUseStats d
      WHERE d.createdDate BETWEEN CAST(:fromDate AS java.time.LocalDateTime)
          AND CAST(:toDate AS java.time.LocalDateTime)
      """)
  long countByDateRange(
      @Param("fromDate") String fromDate,
      @Param("toDate") String toDate);

  /**
   * 源낆쨯??고癒┷곸뒠袁れ넺 
   */
  @Query(value = """
      SELECT TO_CHAR(d.frst_regist_pnttm, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
      FROM ndtausestats d
      WHERE d.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
      GROUP BY TO_CHAR(d.frst_regist_pnttm, 'YYYY-MM-DD')
      ORDER BY statsDate DESC
      """, nativeQuery = true)
  List<Object[]> countByDate(
      @Param("fromDate") String fromDate,
      @Param("toDate") String toDate);

  /**
   * 野껊슣癒癒┷곸뒠袁れ넺 
   */
  @Query(value = """
      SELECT b.bbs_nm as bbsNm, COUNT(*) as cnt
      FROM ndtausestats d
      JOIN nbbsmaster b ON d.bbs_id = b.bbs_id
      WHERE d.frst_regist_pnttm BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
      GROUP BY b.bbs_nm
      ORDER BY cnt DESC
      """, nativeQuery = true)
  List<Object[]> countByBbsId(
      @Param("fromDate") String fromDate,
      @Param("toDate") String toDate);
}
