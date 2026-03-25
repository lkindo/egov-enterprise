package com.company.project.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??뿅??臾먮뼗 野껉퀗??Repository
 */
public interface QustnrRespondInfoRepository extends JpaRepository<QustnrRespondInfo, String> {
    long countByQustnrIemId(String qustnrIemId);
}
