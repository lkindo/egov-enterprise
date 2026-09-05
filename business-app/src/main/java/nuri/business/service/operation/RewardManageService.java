package nuri.business.service.operation;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.BusinessException;

import nuri.business.domain.operation.RewardManage;
import nuri.business.domain.operation.RewardManageRepository;
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
                .ifmlAtrzSn(dto.getIfmlAtrzSn())
                .build();
        // 감사 필드는 빌더 대신 세터로 이월(insert 시 auditing 이 덮으며, merge 시 값 보존)
        reward.setFrstRgtrId(dto.getFrstRgtrId());
        reward.setLastMdfrId(dto.getLastMdfrId());
        return convertToDto(rewardManageRepository.save(reward));
    }

    /** 포상 수정 — 화면이 편집하는 다섯 필드만 갱신한다(2026-09-05 DEC-OPS-036). 승인 필드는 승인 절차가 생길 때 다룬다. */
    @Transactional
    public RewardManageDto updateReward(Long rwrdSn, RewardManageDto dto) {
        RewardManage reward = findRequired(rwrdSn);
        reward.update(dto.getRwardwnrId(), dto.getRwardCode(), dto.getRwardDe(), dto.getRwardNm(), dto.getPblenCn());
        return convertToDto(reward);
    }

    /** 포상 삭제. 없는 대상은 RESOURCE_NOT_FOUND. */
    @Transactional
    public void deleteReward(Long rwrdSn) {
        rewardManageRepository.delete(findRequired(rwrdSn));
    }

    private RewardManage findRequired(Long rwrdSn) {
        return rewardManageRepository.findById(Objects.requireNonNull(rwrdSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
                .ifmlAtrzSn(reward.getIfmlAtrzSn())
                .frstRgtrId(reward.getFrstRgtrId())
                .crtDt(reward.getCrtDt())
                .lastMdfrId(reward.getLastMdfrId())
                .mdfcnDt(reward.getMdfcnDt())
                .build();
    }
}
