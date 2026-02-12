package com.company.project.service.rwd;

import com.company.project.service.rwd.dto.RewardDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RewardService {
    Page<RewardDto> getRewardList(String keyword, Pageable pageable);
    
    RewardDto getReward(String rwardId);
    
    String createReward(String userId, RewardDto dto);
    
    void updateReward(String rwardId, String userId, RewardDto dto);
    
    void deleteReward(String rwardId);
    
    void confirmReward(String rwardId, String userId, String confmAt, String returnResn);
}
