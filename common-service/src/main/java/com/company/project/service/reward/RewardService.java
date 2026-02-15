package com.company.project.service.reward;

import com.company.project.domain.reward.Reward;
import com.company.project.domain.reward.RewardRepository;
import com.company.project.service.reward.dto.RewardDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RewardService implements EgovRewardService {

    private final RewardRepository rewardRepository;

    public RewardService(
            @org.springframework.beans.factory.annotation.Qualifier("rwdRewardRepository") RewardRepository rewardRepository) {
        this.rewardRepository = rewardRepository;
    }

    @Override
    public RewardDto getReward(String rwardId) {
        return rewardRepository.findById(rwardId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerReward(RewardDto dto) {
        Reward reward = Reward.builder()
                .rwardId(dto.getRwardId())
                .rwardManId(dto.getRwardManId())
                .rwardCode(dto.getRwardCode())
                .rwardDe(dto.getRwardDe())
                .rwardNm(dto.getRwardNm())
                .pblenCn(dto.getPblenCn())
                .sanctnerId(dto.getSanctnerId())
                .confmAt("N") // 초기 상태
                .atchFileId(dto.getAtchFileId())
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        rewardRepository.save(reward);
    }

    @Override
    @Transactional
    public void updateReward(RewardDto dto) {
        rewardRepository.findById(dto.getRwardId())
                .ifPresent(r -> {
                    // Reward 엔티티에 update 메소드 추가 필요 시 반영
                });
    }

    @Override
    @Transactional
    public void deleteReward(String rwardId) {
        rewardRepository.deleteById(rwardId);
    }

    @Override
    public Page<RewardDto> getRewardList(String searchKeyword, Pageable pageable) {
        return rewardRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    @Override
    @Transactional
    public void confirmReward(RewardDto dto) {
        rewardRepository.findById(dto.getRwardId())
                .ifPresent(r -> {
                    // 승인 상태 및 반려 사유 업데이트 로직
                });
    }

    @Override
    public Page<RewardDto> getRewardConfirmList(String sanctnerId, Pageable pageable) {
        // sanctnerId 기반 필터링 로직 (Repository 확장 필요)
        return null;
    }

    private RewardDto convertToDto(Reward r) {
        return RewardDto.builder()
                .rwardId(r.getRwardId())
                .rwardManId(r.getRwardManId())
                .rwardCode(r.getRwardCode())
                .rwardDe(r.getRwardDe())
                .rwardNm(r.getRwardNm())
                .pblenCn(r.getPblenCn())
                .sanctnerId(r.getSanctnerId())
                .confmAt(r.getConfmAt())
                .sanctnDt(r.getSanctnDt())
                .returnResn(r.getReturnResn())
                .atchFileId(r.getAtchFileId())
                .infrmlSanctnId(r.getInfrmlSanctnId())
                .build();
    }
}
