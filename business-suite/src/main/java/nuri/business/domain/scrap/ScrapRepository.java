package nuri.business.domain.scrap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 스크랩 Repository
 */
public interface ScrapRepository extends JpaRepository<Scrap, String> {

    Page<Scrap> findByCreatedBy(String createdBy, Pageable pageable);

    Page<Scrap> findByBbsId(String bbsId, Pageable pageable);

    Page<Scrap> findByCreatedByAndUseYn(String createdBy, String useYn, Pageable pageable);
}
