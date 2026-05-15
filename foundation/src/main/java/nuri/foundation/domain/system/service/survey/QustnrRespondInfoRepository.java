package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 설문응답 정보 Repository
 */
@Repository
public interface QustnrRespondInfoRepository extends JpaRepository<QustnrRespondInfo, String> {
    long countBySrvyItemId(String srvyItemId);
}
