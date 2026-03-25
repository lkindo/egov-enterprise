package com.company.project.foundation.service.operation;

import com.company.project.foundation.domain.operation.RewardManage;
import com.company.project.foundation.repository.operation.RewardManageRepository;
import com.company.project.foundation.service.operation.dto.RewardManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardManageService {

    private final RewardManageRepository rewardManageRepository;

    public List<RewardManageDto> getAllRewards() {
        return rewardManageRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<RewardManageDto> searchByName(String name) {
        return rewardManageRepository.findByRwardNmContaining(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        RewardManage reward = RewardManage.builder()
                .rwardId(dto.getRwardId())
                .rwardwnrId(dto.getRwardwnrId())
                .rwardCode(dto.getRwardCode())
                .rwardDe(dto.getRwardDe())
                .rwardNm(dto.getRwardNm())
                .pblenCn(dto.getPblenCn())
                .sanctnerId(dto.getSanctnerId())
                .confmAt(dto.getConfmAt())
                .sanctnDt(dto.getSanctnDt())
                .returnResn(dto.getReturnResn())
                .atchFileId(dto.getAtchFileId())
                .informlSanctnId(dto.getInformlSanctnId())
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getLastUpdusrId())
                .build();
        return convertToDto(rewardManageRepository.save(reward));
    }

    private RewardManageDto convertToDto(RewardManage reward) {
        return RewardManageDto.builder()
                .rwardId(reward.getRwardId())
                .rwardwnrId(reward.getRwardwnrId())
                .rwardCode(reward.getRwardCode())
                .rwardDe(reward.getRwardDe())
                .rwardNm(reward.getRwardNm())
                .pblenCn(reward.getPblenCn())
                .sanctnerId(reward.getSanctnerId())
                .confmAt(reward.getConfmAt())
                .sanctnDt(reward.getSanctnDt())
                .returnResn(reward.getReturnResn())
                .atchFileId(reward.getAtchFileId())
                .informlSanctnId(reward.getInformlSanctnId())
                .frstRegisterId(reward.getFrstRegisterId())
                .frstRegistPnttm(reward.getFrstRegistPnttm())
                .lastUpdusrId(reward.getLastUpdusrId())
                .lastUpdtPnttm(reward.getLastUpdtPnttm())
                .build();
    }
}
