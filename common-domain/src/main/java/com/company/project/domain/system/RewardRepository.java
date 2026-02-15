package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("systemRewardRepository")
public interface RewardRepository extends JpaRepository<Reward, String> {
    Page<Reward> findByRwardManId(String rwardManId, Pageable pageable);
}
