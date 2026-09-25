package nuri.business.service.operation;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.BusinessException;

import nuri.business.domain.operation.RewardManage;
import nuri.business.domain.operation.RewardManageRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
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
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

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

    /**
     * 포상 등록.
     *
     * <p>승인 필드(승인자·승인 여부·승인 일시·반려 사유·연결 결재)와 감사 필드는 <b>서버가 소유한다</b>.
     * 종전에는 요청 값을 그대로 저장해, 등록 권한만 있으면 승인 절차 없이 '승인 완료·승인자 X' 인
     * 포상을 만들 수 있었다(2026-09-25 DIP I6 ③, GAP-DOMAIN-001 ③). 승인 절차가 제품에 없으므로
     * 새 포상은 언제나 대기('N')로 시작하고 승인 필드는 비워 둔다.</p>
     */
    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        RewardManage reward = RewardManage.builder()
                .rwrdUserId(dto.getRwardwnrId())
                .rwrdCd(dto.getRwardCode())
                .rwrdYmd(dto.getRwardDe())
                .rwrdNm(dto.getRwardNm())
                .cntrbCn(dto.getPblenCn())
                .confmYn(PENDING_APPROVAL)
                .atchFileSn(atchFileSn)
                .build();
        return convertToDto(rewardManageRepository.save(reward));
    }

    /** 새 포상의 승인 상태. 승인 절차가 생기기 전까지 모든 포상은 대기로 시작한다. */
    private static final String PENDING_APPROVAL = "N";

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
