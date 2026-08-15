package nuri.business.domain.system.content.banner;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * 배너 관리 Repository
 */
public interface BannerRepository extends JpaRepository<Banner, Long> {
    Page<Banner> findByBnrNmContaining(String bnrNm, Pageable pageable);
    List<Banner> findByRfltYnOrderBySortOrdrAsc(String rfltYn);
}
