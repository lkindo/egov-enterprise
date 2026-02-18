package com.company.project.service.system;

import com.company.project.domain.system.Reward;
import com.company.project.domain.system.RewardRepository;
import com.company.project.service.system.dto.RewardDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service("systemRewardService")
public class RewardService extends EgovAbstractServiceImpl {

    private final RewardRepository rewardRepository;

    public RewardService(
            @org.springframework.beans.factory.annotation.Qualifier("systemRewardRepository") RewardRepository rewardRepository) {
        this.rewardRepository = rewardRepository;
    }

    @Transactional(readOnly = true)
    public Page<RewardDto> getRewardList(String rwardManId, Pageable pageable) {
        return rewardRepository.findByRwardManId(rwardManId == null ? "" : rwardManId, pageable).map(RewardDto::from);
    }

    @Transactional(readOnly = true)
    public RewardDto getReward(String rwardId) {
        Reward entity = rewardRepository.findById(Objects.requireNonNull(rwardId))
                .orElseThrow(() -> new RuntimeException("Reward record not found"));
        return RewardDto.from(entity);
    }

    @Transactional
    public void createReward(RewardDto dto) {
        Reward entity = Reward.builder()
                .rwardId(dto.getRwardId())
                .rwardManId(dto.getRwardManId())
                .rwardCd(dto.getRwardCd())
                .rwardDe(dto.getRwardDe())
                .rwardNm(dto.getRwardNm())
                .pblenCn(dto.getPblenCn())
                .atchFileId(dto.getAtchFileId())
                .confmAt("N")
                .build();
        rewardRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateReward(RewardDto dto) {
        Reward entity = rewardRepository.findById(Objects.requireNonNull(dto.getRwardId()))
                .orElseThrow(() -> new RuntimeException("Reward record not found"));

        entity.setRwardCd(dto.getRwardCd());
        entity.setRwardDe(dto.getRwardDe());
        entity.setRwardNm(dto.getRwardNm());
        entity.setPblenCn(dto.getPblenCn());
        entity.setAtchFileId(dto.getAtchFileId());
    }

    @Transactional
    public void deleteReward(String rwardId) {
        rewardRepository.deleteById(Objects.requireNonNull(rwardId));
    }

    @Transactional
    public void approveReward(String rwardId, String sanctnerId) {
        Reward entity = rewardRepository.findById(Objects.requireNonNull(rwardId))
                .orElseThrow(() -> new RuntimeException("Reward record not found"));
        entity.setConfmAt("Y");
        entity.setSanctnerId(sanctnerId);
        entity.setSanctnDt(LocalDateTime.now().toString());
    }
}
