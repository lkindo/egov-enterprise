package nuri.business.domain.memoreport;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoReportRepository extends JpaRepository<MemoReport, String> {
    Page<MemoReport> findByUserId(String userId, Pageable pageable);
    Page<MemoReport> findByRptrId(String rptrId, Pageable pageable);

    /**
     * 제목 부분일치 검색(관리자 전용 전건 조회 경로에서 사용).
     *
     * <p>종전 {@code searchMemoReports} 는 검색어를 받고도 {@code findAll} 을 돌려주는 default 메서드여서
     * 관리 화면의 검색이 조용히 무동작이었다. 실제 조건 검색으로 대체한다.</p>
     *
     * @param keyword 제목 부분일치. 빈 문자열이면 전체(널은 전달하지 않는다)
     */
    @Query("SELECT m FROM MemoReport m WHERE m.rptTtl LIKE CONCAT('%', :keyword, '%')")
    Page<MemoReport> searchByTitle(@Param("keyword") String keyword, Pageable pageable);
}
