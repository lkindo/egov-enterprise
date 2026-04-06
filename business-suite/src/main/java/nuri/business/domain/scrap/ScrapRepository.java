package nuri.business.domain.scrap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??쎄쾿??Repository
 */
public interface ScrapRepository extends JpaRepository<Scrap, String> {

    Page<Scrap> findByUniqId(String uniqId, Pageable pageable);

    Page<Scrap> findByBbsId(String bbsId, Pageable pageable);

    Page<Scrap> findByUniqIdAndUseAt(String uniqId, String useAt, Pageable pageable);
}
