package nuri.business.domain.stats;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 자료 이용 통계 Repository. 날짜 범위는 [fromDate, toDate)인 반개방 구간이다.
 *
 * <p>[2026-09-25] 호출처가 없던 목록·건수·게시판별·막대·상세 조회를 걷었다. 그중 목록 조회는 존재하지 않는
 * 컬럼(bbs_nm·ntt_sj·orignl_file_nm)을 가리켜 호출되는 순간 실패했을 쿼리다.
 */
@Repository
public interface DtaUseStatsRepository extends JpaRepository<DtaUseStats, Long> {

  /**
   * 날짜별 데이터 사용 통계
   */
  @Query(value = """
      SELECT TO_CHAR(d.crt_dt, 'YYYY-MM-DD') as statsDate, COUNT(*) as cnt
      FROM tb_dta_use_stats d
      WHERE d.crt_dt >= CAST(:fromDate AS TIMESTAMP) AND d.crt_dt < CAST(:toDate AS TIMESTAMP)
      GROUP BY TO_CHAR(d.crt_dt, 'YYYY-MM-DD')
      ORDER BY statsDate DESC
      """, nativeQuery = true)
  List<Object[]> countByDate(
      @Param("fromDate") String fromDate,
      @Param("toDate") String toDate);
}
