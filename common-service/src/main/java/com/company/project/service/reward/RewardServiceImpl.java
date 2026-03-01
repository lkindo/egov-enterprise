package com.company.project.service.reward;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.reward.Reward;
import com.company.project.domain.reward.RewardRepository;
import com.company.project.service.reward.dto.RewardDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardServiceImpl implements RewardService {

    private final RewardRepository rewardRepository;
    private final EgovIdGnrService egovRwardManageIdGnrService;

    @Override
    public Page<RewardDto> getRewardList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return rewardRepository.findAll(pageable).map(RewardDto::from);
        }
        return rewardRepository.findByRwardNmContaining(keyword, pageable).map(RewardDto::from);
    }

    @Override
    public RewardDto getReward(String rwardId) {
        return rewardRepository.findById(Objects.requireNonNull(rwardId))
                .map(RewardDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createReward(String userId, RewardDto dto) {
        try {
            String id = egovRwardManageIdGnrService.getNextStringId();
            Reward entity = Reward.builder()
                    .rwardId(id)
                    .rwardwnrId(dto.getRwardwnrId())
                    .rwardCode(dto.getRwardCode())
                    .rwardDe(dto.getRwardDe())
                    .rwardNm(dto.getRwardNm())
                    .pblenCn(dto.getPblenCn())
                    .confmAt("R")
                    .atchFileId(dto.getAtchFileId())
                    .infrmlSanctnId(dto.getInfrmlSanctnId())
                    .frstRegisterId(userId)
                    .build();
            rewardRepository.save(Objects.requireNonNull(entity));
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate reward ID", e);
        }
    }

    @Override
    @Transactional
    public void updateReward(String rwardId, String userId, RewardDto dto) {
        Reward entity = rewardRepository.findById(Objects.requireNonNull(rwardId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getRwardCode(), dto.getRwardDe(), dto.getRwardNm(), dto.getPblenCn(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteReward(String rwardId) {
        if (!rewardRepository.existsById(Objects.requireNonNull(rwardId))) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        rewardRepository.deleteById(Objects.requireNonNull(rwardId));
    }

    @Override
    @Transactional
    public void confirmReward(String rwardId, String userId, String confmAt, String returnResn) {
        Reward entity = rewardRepository.findById(Objects.requireNonNull(rwardId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.confirm(confmAt, LocalDateTime.now(), returnResn, userId);
    }
}
