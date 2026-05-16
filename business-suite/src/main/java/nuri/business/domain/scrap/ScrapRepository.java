package nuri.business.domain.scrap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScrapRepository extends JpaRepository<Scrap, String> {
    Page<Scrap> findByCreatedByAndUseAt(String createdBy, String useAt, Pageable pageable);
}
