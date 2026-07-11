package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SurveyResultRepository extends JpaRepository<SurveyResult, String> {
    long countBySrvyArtclId(String srvyArtclId);
}
