package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 온라인 투표 항목 Repository
 */
public interface OnlinePollItemRepository extends JpaRepository<OnlinePollItem, String> {
    List<OnlinePollItem> findByPollId(String pollId);
}
