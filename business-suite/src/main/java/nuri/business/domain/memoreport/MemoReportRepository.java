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

    @Query("SELECT m FROM MemoReport m WHERE m.writerId = :writerId ORDER BY m.rptYmd DESC")
    Page<MemoReport> findByWriterId(@Param("writerId") String writerId, Pageable pageable);

    @Query("SELECT m FROM MemoReport m WHERE m.rptUserId = :rptUserId ORDER BY m.rptYmd DESC")
    Page<MemoReport> findByRptUserId(@Param("rptUserId") String rptUserId, Pageable pageable);

    @Query("SELECT m FROM MemoReport m WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR m.rptTtl LIKE %:keyword% OR m.rptCn LIKE %:keyword%) " +
            "ORDER BY m.rptYmd DESC")
    Page<MemoReport> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
