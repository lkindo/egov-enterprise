package nuri.business.service.reward;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;

import nuri.business.domain.reward.RewardManage;
import nuri.business.domain.reward.RewardManageRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.reward.dto.RewardManageDto;
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
     * <p>감사 필드는 <b>서버가 소유한다</b>. 승인 필드(승인자·승인 여부·승인 일시·반려 사유·연결 결재)는 승인 절차가
     * 제품에 없어 2026-10-19 API 에서 걷었고, 앱은 그 물리 컬럼에 쓰지 않는다 — 종전에는 새 포상을 언제나 대기('N')로
     * 적어, 아무도 승인할 수 없는 대기 상태를 만들었다(2026-09-25 DIP I6 ③ 의 위조 차단은 필드 제거로 대체).</p>
     */
    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        SecurityUtil.assertPermission("REWARD_CREATE");
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
                .atchFileSn(atchFileSn)
                .build();
        return convertToDto(rewardManageRepository.save(reward));
    }

    /** 포상 수정 — 화면이 편집하는 필드와 첨부파일을 갱신한다(2026-09-05 DEC-OPS-036). */
    @Transactional
    public RewardManageDto updateReward(Long rwrdSn, RewardManageDto dto) {
        SecurityUtil.assertPermission("REWARD_UPDATE");
        RewardManage reward = findRequired(rwrdSn);
        // [2026-10-18] 화면이 읽은 버전과 다르면 다른 사람이 먼저 고친 것이다 — 덮지 않고 409 로 알린다.
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), reward.getVersion());
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null && !Objects.equals(reward.getAtchFileSn(), atchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        reward.update(dto.getRwardwnrId(), dto.getRwardCode(), dto.getRwardDe(), dto.getRwardNm(), dto.getPblenCn(),
                atchFileSn != null ? atchFileSn : reward.getAtchFileSn());
        // 올라간 버전을 응답에 싣는다 — @Version 은 flush 때 오르므로 먼저 내보낸다(결재 임시저장 선례).
        rewardManageRepository.flush();
        return convertToDto(reward);
    }

    /** 포상 삭제. 없는 대상은 RESOURCE_NOT_FOUND. */
    @Transactional
    public void deleteReward(Long rwrdSn) {
        SecurityUtil.assertPermission("REWARD_DELETE");
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
                .atchFileSn(reward.getAtchFileSn())
                .frstRgtrId(reward.getFrstRgtrId())
                .crtDt(reward.getCrtDt())
                .lastMdfrId(reward.getLastMdfrId())
                .mdfcnDt(reward.getMdfcnDt())
                .version(reward.getVersion())
                .build();
    }
}
