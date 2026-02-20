package com.company.project.service.reward;

import com.company.project.domain.reward.Reward;
import com.company.project.domain.reward.RewardRepository;
import com.company.project.service.reward.dto.RewardDto;
import java.util.Objects;
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
        return rewardRepository.findById(Objects.requireNonNull(rwardId))
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
                .confmAt("N") // 珥덇린 ?곹깭
                .atchFileId(dto.getAtchFileId())
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        rewardRepository.save(Objects.requireNonNull(reward));
    }

    @Override
    @Transactional
    public void updateReward(RewardDto dto) {
        rewardRepository.findById(Objects.requireNonNull(dto.getRwardId()))
                .ifPresent(r -> {
                    // Reward ?뷀떚?곗뿉 update 硫붿냼??異붽? ?꾩슂 ??諛섏쁺
                });
    }

    @Override
    @Transactional
    public void deleteReward(String rwardId) {
        rewardRepository.deleteById(Objects.requireNonNull(rwardId));
    }

    @Override
    public Page<RewardDto> getRewardList(String searchKeyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return rewardRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    @Override
    @Transactional
    public void confirmReward(RewardDto dto) {
        rewardRepository.findById(Objects.requireNonNull(dto.getRwardId()))
                .ifPresent(r -> {
                    // ?뱀씤 ?곹깭 諛?諛섎젮 ?ъ쑀 ?낅뜲?댄듃 濡쒖쭅
                });
    }

    @Override
    public Page<RewardDto> getRewardConfirmList(String sanctnerId, Pageable pageable) {
        // sanctnerId 湲곕컲 ?꾪꽣留?濡쒖쭅 (Repository ?뺤옣 ?꾩슂)
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
