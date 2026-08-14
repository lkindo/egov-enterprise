package nuri.business.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SurveyInfoRepository extends JpaRepository<SurveyInfo, Long> {
    Optional<SurveyInfo> findBySrvySn(Long srvySn);
    Page<SurveyInfo> findBySrvyTtlContaining(String keyword, Pageable pageable);
}
