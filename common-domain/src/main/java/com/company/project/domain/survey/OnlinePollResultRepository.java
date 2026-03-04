package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * ??ㅼ뵬????紐?野껉퀗??Repository
 */
public interface OnlinePollResultRepository extends JpaRepository<OnlinePollResult, String> {
    long countByPollIemId(String pollIemId);

    @Query("SELECT COUNT(r) FROM OnlinePollResult r WHERE r.pollId = :pollId AND r.createdBy = :frstRegisterId")
    long countByPollIdAndFrstRegisterId(@Param("pollId") String pollId, @Param("frstRegisterId") String frstRegisterId);

    List<OnlinePollResult> findByPollId(String pollId);

    void deleteByPollId(String pollId);
}