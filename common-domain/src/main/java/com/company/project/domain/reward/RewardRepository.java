package com.company.project.domain.reward;

import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository("rwdRewardRepository")
public interface RewardRepository extends JpaRepository<Reward, String> {
}
