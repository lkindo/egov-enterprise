package nuri.business.domain.memoreport;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 메모보고 저장소
 */
@Repository
public interface MemoReportRepository extends JpaRepository<MemoReport, String> {

    @Query("SELECT m FROM MemoReport m WHERE m.wrterId = :wrterId ORDER BY m.reportDe DESC")
    Page<MemoReport> findByWrterId(@Param("wrterId") String wrterId, Pageable pageable);

    @Query("SELECT m FROM MemoReport m WHERE m.reportrId = :reportrId ORDER BY m.reportDe DESC")
    Page<MemoReport> findByReportrId(@Param("reportrId") String reportrId, Pageable pageable);

    @Query("SELECT m FROM MemoReport m WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR m.reprtSj LIKE %:keyword% OR m.reportCn LIKE %:keyword%) " +
            "ORDER BY m.reportDe DESC")
    Page<MemoReport> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
