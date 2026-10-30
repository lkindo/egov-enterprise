package nuri.business.domain.board;

import java.time.LocalDateTime;
import nuri.foundation.core.stats.StatsTimestamp;
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
  default List<Object[]> countByDate(String fromDate, String toDate) {
    return countPerDay(StatsTimestamp.parse(fromDate), StatsTimestamp.parse(toDate));
  }

  /** 일자 형식은 Hibernate 가 벤더 함수로 만든다. */
  @Query("""
      SELECT format(d.crtDt as 'yyyy-MM-dd') as statsDate, COUNT(d) as cnt
      FROM DtaUseStats d
      WHERE d.crtDt >= :fromDate AND d.crtDt < :toDate
      GROUP BY format(d.crtDt as 'yyyy-MM-dd')
      ORDER BY statsDate DESC
      """)
  List<Object[]> countPerDay(
      @Param("fromDate") LocalDateTime fromDate,
      @Param("toDate") LocalDateTime toDate);
}
