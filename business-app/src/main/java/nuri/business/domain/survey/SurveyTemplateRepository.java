package nuri.business.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, Long> {
    Page<SurveyTemplate> findBySrvyTmpltTypeCdContaining(String keyword, Pageable pageable);
}
