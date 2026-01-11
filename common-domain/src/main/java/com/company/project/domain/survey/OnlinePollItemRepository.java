package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnlinePollItemRepository extends JpaRepository<OnlinePollItem, String> {
    List<OnlinePollItem> findByPollId(String pollId);

    void deleteByPollId(String pollId);
}
