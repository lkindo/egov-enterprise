package nuri.business.service.operation;

import nuri.business.domain.operation.RewardManage;
import nuri.business.repository.operation.RewardManageRepository;
import nuri.business.service.operation.dto.RewardManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardManageService {

    private final RewardManageRepository rewardManageRepository;

    /**
     * 포상 목록 조회(페이징). 포상명(name)이 주어지면 부분일치 검색한다.
     * 목록 응답은 컨트롤러에서 {@code PageResponse.of(...)} 로 표준화된다.
     */
    public Page<RewardManageDto> getRewardList(String name, Pageable pageable) {
        Pageable page = Objects.requireNonNull(pageable);
        if (name == null || name.trim().isEmpty()) {
            return rewardManageRepository.findAll(page).map(this::convertToDto);
        }
        return rewardManageRepository.findByRwrdNmContaining(name, page).map(this::convertToDto);
    }

    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        RewardManage reward = RewardManage.builder()
                .rwrdUserId(dto.getRwardwnrId())
                .rwrdCd(dto.getRwardCode())
                .rwrdYmd(dto.getRwardDe())
                .rwrdNm(dto.getRwardNm())
                .cntrbCn(dto.getPblenCn())
                .atrzrId(dto.getSanctnerId())
                .confmYn(dto.getConfmAt())
                .aprvDt(dto.getSanctnDt())
                .rtnRsnCn(dto.getReturnResn())
                .atchFileSn(dto.getAtchFileSn())
                .ifmlAtrzId(dto.getInformlSanctnId())
                .build();
        // 감사 필드는 빌더 대신 세터로 이월(insert 시 auditing 이 덮으며, merge 시 값 보존)
        reward.setFrstRgtrId(dto.getFrstRgtrId());
        reward.setLastMdfrId(dto.getLastMdfrId());
        return convertToDto(rewardManageRepository.save(reward));
    }

    private RewardManageDto convertToDto(RewardManage reward) {
        return RewardManageDto.builder()
                .rwrdSn(reward.getRwrdSn())
                .rwardwnrId(reward.getRwrdUserId())
                .rwardCode(reward.getRwrdCd())
                .rwardDe(reward.getRwrdYmd())
                .rwardNm(reward.getRwrdNm())
                .pblenCn(reward.getCntrbCn())
                .sanctnerId(reward.getAtrzrId())
                .confmAt(reward.getConfmYn())
                .sanctnDt(reward.getAprvDt())
                .returnResn(reward.getRtnRsnCn())
                .atchFileSn(reward.getAtchFileSn())
                .informlSanctnId(reward.getIfmlAtrzId())
                .frstRgtrId(reward.getFrstRgtrId())
                .crtDt(reward.getCrtDt())
                .lastMdfrId(reward.getLastMdfrId())
                .mdfcnDt(reward.getMdfcnDt())
                .build();
    }
}
