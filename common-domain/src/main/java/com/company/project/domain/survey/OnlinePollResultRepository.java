package com.company.project.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 온라인 투표 결과 Repository
 */
public interface OnlinePollResultRepository extends JpaRepository<OnlinePollResult, String> {
    long countByPollIemId(String pollIemId);
}
