package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 설문 응답 결과 Repository
 */
public interface QustnrRespondInfoRepository extends JpaRepository<QustnrRespondInfo, String> {
    long countByQustnrIemId(String qustnrIemId);
}
