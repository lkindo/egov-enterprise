package com.company.project.service.reward;

import com.company.project.service.reward.dto.RewardDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRewardService {
    RewardDto getReward(String rwardId);

    void registerReward(RewardDto dto);

    void updateReward(RewardDto dto);

    void deleteReward(String rwardId);

    Page<RewardDto> getRewardList(String searchKeyword, Pageable pageable);

    // ?뱀씤 泥섎━ (?쎌떇 ?뱀씤 ?곕룞)
    void confirmReward(RewardDto dto);

    Page<RewardDto> getRewardConfirmList(String sanctnerId, Pageable pageable);
}
