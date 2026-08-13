package nuri.business.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 온라인 매뉴얼 Repository
 */
public interface OnlineManualRepository extends JpaRepository<OnlineManual, Long> {
    Page<OnlineManual> findByOnlnMnlNmContaining(String onlnMnlNm, Pageable pageable);
}
