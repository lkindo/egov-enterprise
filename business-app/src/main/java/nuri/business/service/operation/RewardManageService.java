package nuri.business.service.operation;

import nuri.business.domain.operation.RewardManage;
import nuri.business.repository.operation.RewardManageRepository;
import nuri.business.service.operation.dto.RewardManageDto;
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
        return rewardManageRepository.findByRwrdNmContaining(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        RewardManage reward = RewardManage.builder()
                .rwrdId(dto.getRwardId())
                .rwrdUserId(dto.getRwardwnrId())
                .rwrdCd(dto.getRwardCode())
                .rwrdYmd(dto.getRwardDe())
                .rwrdNm(dto.getRwardNm())
                .cntrbCn(dto.getPblenCn())
                .atrzrId(dto.getSanctnerId())
                .confmYn(dto.getConfmAt())
                .aprvDt(dto.getSanctnDt())
                .rtnRsnCn(dto.getReturnResn())
                .atchFileId(dto.getAtchFileId())
                .ifmlAtrzId(dto.getInformlSanctnId())
                .build();
        // 감사 필드는 빌더 대신 세터로 이월(insert 시 auditing 이 덮으며, merge 시 값 보존)
        reward.setFrstRgtrId(dto.getFrstRgtrId());
        reward.setLastMdfrId(dto.getLastMdfrId());
        return convertToDto(rewardManageRepository.save(reward));
    }

    private RewardManageDto convertToDto(RewardManage reward) {
        return RewardManageDto.builder()
                .rwardId(reward.getRwrdId())
                .rwardwnrId(reward.getRwrdUserId())
                .rwardCode(reward.getRwrdCd())
                .rwardDe(reward.getRwrdYmd())
                .rwardNm(reward.getRwrdNm())
                .pblenCn(reward.getCntrbCn())
                .sanctnerId(reward.getAtrzrId())
                .confmAt(reward.getConfmYn())
                .sanctnDt(reward.getAprvDt())
                .returnResn(reward.getRtnRsnCn())
                .atchFileId(reward.getAtchFileId())
                .informlSanctnId(reward.getIfmlAtrzId())
                .frstRgtrId(reward.getFrstRgtrId())
                .crtDt(reward.getCrtDt())
                .lastMdfrId(reward.getLastMdfrId())
                .mdfcnDt(reward.getMdfcnDt())
                .build();
    }
}
