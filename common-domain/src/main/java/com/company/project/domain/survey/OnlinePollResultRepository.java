package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnlinePollResultRepository extends JpaRepository<OnlinePollResult, String> {
    List<OnlinePollResult> findByPollId(String pollId);

    void deleteByPollId(String pollId);

    long countByPollIdAndFrstRegisterId(String pollId, String frstRegisterId);
}
