package nuri.business.domain.memoreport;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoReportRepository extends JpaRepository<MemoReport, String> {
    Page<MemoReport> findByUserId(String userId, Pageable pageable);
    Page<MemoReport> findByRptrId(String rptrId, Pageable pageable);

    @Deprecated
    default Page<MemoReport> findByWriterId(String writerId, Pageable pageable) {
        return findByUserId(writerId, pageable);
    }

    @Deprecated
    default Page<MemoReport> findByReportrId(String reportrId, Pageable pageable) {
        return findByRptrId(reportrId, pageable);
    }
    
    default Page<MemoReport> searchMemoReports(String searchCondition, String searchKeyword, Pageable pageable) {
        return findAll(pageable);
    }
}
