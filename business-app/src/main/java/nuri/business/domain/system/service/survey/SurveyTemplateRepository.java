package nuri.business.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, Long> {
    Optional<SurveyTemplate> findBySrvyTmpltSn(Long srvyTmpltSn);
    Page<SurveyTemplate> findBySrvyTmpltTypeCdContaining(String keyword, Pageable pageable);
}
