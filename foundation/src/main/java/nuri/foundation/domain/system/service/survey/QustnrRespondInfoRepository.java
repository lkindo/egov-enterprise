package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 설문응답 정보 Repository
 */
public interface QustnrRespondInfoRepository extends JpaRepository<QustnrRespondInfo, String> {
    long countByQustnrIemId(String qustnrIemId);
}
