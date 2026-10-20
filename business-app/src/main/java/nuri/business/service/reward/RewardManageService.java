package nuri.business.service.reward;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;

import nuri.business.domain.reward.RewardManage;
import nuri.business.domain.reward.RewardManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.reward.dto.RewardManageDto;
import nuri.business.service.user.dto.UserSearchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardManageService {

    /** 사용 중 계정의 상태 코드 — 담당자 검색(UserRepositoryImpl#searchAssignableUsers)과 결재자 판정이 쓰는 같은 값이다. */
    static final String ACTIVE_USER_STATUS = "P";
    static final String AWARDEE_REQUIRED = "수상자를 선택해 주세요.";
    static final String AWARDEE_NOT_FOUND = "수상자 계정을 찾을 수 없습니다. 사용자 검색으로 수상자를 다시 선택해 주세요.";
    static final String AWARDEE_INACTIVE = "수상자가 사용 중인 계정이 아닙니다. 사용 중인 사용자를 수상자로 선택해 주세요.";

    private final RewardManageRepository rewardManageRepository;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    private final UserRepository userRepository;

    /**
     * 포상 목록 조회(페이징). 포상명(name)이 주어지면 부분일치 검색한다.
     * 목록 응답은 컨트롤러에서 {@code PageResponse.of(...)} 로 표준화된다.
     *
     * <p>[2026-10-20] 수상자 이름·부서를 함께 싣는다 — 종전에는 내부 식별자만 보여 누가 받았는지 화면에서 알 수 없었다.
     * 한 페이지의 수상자를 한 번에 조회한다(행마다 조회하지 않는다). 계정이 지워졌으면 이름 없이 식별자만 남는다.</p>
     */
    public Page<RewardManageDto> getRewardList(String name, Pageable pageable) {
        Pageable page = Objects.requireNonNull(pageable);
        Page<RewardManage> rewards = name == null || name.trim().isEmpty()
                ? rewardManageRepository.findAll(page)
                : rewardManageRepository.findByRwrdNmContaining(name, page);
        Map<String, UserSearchDto> awardees = awardeeProfiles(
                rewards.getContent().stream().map(RewardManage::getRwrdUserId).toList());
        return rewards.map(reward -> convertToDto(reward, profileOf(awardees, reward.getRwrdUserId())));
    }

    /**
     * 포상 등록.
     *
     * <p>감사 필드는 <b>서버가 소유한다</b>. 승인 필드(승인자·승인 여부·승인 일시·반려 사유·연결 결재)는 승인 절차가
     * 제품에 없어 2026-10-19 API 에서 걷었고, 앱은 그 물리 컬럼에 쓰지 않는다 — 종전에는 새 포상을 언제나 대기('N')로
     * 적어, 아무도 승인할 수 없는 대기 상태를 만들었다(2026-09-25 DIP I6 ③ 의 위조 차단은 필드 제거로 대체).</p>
     *
     * <p>[2026-10-20] 수상자는 있는 사용 중 계정이어야 한다. 종전에는 아무 문자열이나 받아 없는 사람에게 포상이 기록됐다
     * (화면이 식별자를 자유 입력으로 받았다).</p>
     */
    @Transactional
    public RewardManageDto createReward(RewardManageDto dto) {
        SecurityUtil.assertPermission("REWARD_CREATE");
        UserSearchDto awardee = requireAssignableAwardee(dto.getRwardwnrId());
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
        return convertToDto(rewardManageRepository.save(reward), awardee);
    }

    /**
     * 포상 수정 — 화면이 편집하는 필드와 첨부파일을 갱신한다(2026-09-05 DEC-OPS-036).
     *
     * <p>[2026-10-20] 수상자를 바꾸면 새 수상자가 있는 사용 중 계정이어야 한다. 수상자를 그대로 두는 수정은 계정 상태를 보지
     * 않는다 — 포상은 받은 당시의 기록이라, 수상자가 그 뒤 퇴직(사용 중지)했다고 공적 내용의 오타조차 고칠 수 없게 하지 않는다
     * (첨부도 바뀐 것만 다시 검사한다).</p>
     */
    @Transactional
    public RewardManageDto updateReward(Long rwrdSn, RewardManageDto dto) {
        SecurityUtil.assertPermission("REWARD_UPDATE");
        RewardManage reward = findRequired(rwrdSn);
        // [2026-10-18] 화면이 읽은 버전과 다르면 다른 사람이 먼저 고친 것이다 — 덮지 않고 409 로 알린다.
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), reward.getVersion());
        UserSearchDto awardee = Objects.equals(reward.getRwrdUserId(), dto.getRwardwnrId())
                ? awardeeProfile(reward.getRwrdUserId())
                : requireAssignableAwardee(dto.getRwardwnrId());
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null && !Objects.equals(reward.getAtchFileSn(), atchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        reward.update(dto.getRwardwnrId(), dto.getRwardCode(), dto.getRwardDe(), dto.getRwardNm(), dto.getPblenCn(),
                atchFileSn != null ? atchFileSn : reward.getAtchFileSn());
        // 올라간 버전을 응답에 싣는다 — @Version 은 flush 때 오르므로 먼저 내보낸다(결재 임시저장 선례).
        rewardManageRepository.flush();
        return convertToDto(reward, awardee);
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

    /**
     * 수상자로 지정할 수 있는 계정인가 — 있고 사용 중(P)이어야 한다. 아니면 400 과 다음 행동을 적은 문구로 거부한다.
     * 거부 문구에는 이름을 싣지 않는다 — 식별자만으로 사용 중이 아닌 계정의 이름을 알아내는 경로가 되지 않게 한다(결재자 판정과 같다).
     */
    private UserSearchDto requireAssignableAwardee(String awardeeId) {
        if (!StringUtils.hasText(awardeeId)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, AWARDEE_REQUIRED);
        }
        String status = userRepository.findById(awardeeId)
                .map(user -> user.getUserSttsCd() == null ? "" : user.getUserSttsCd())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, AWARDEE_NOT_FOUND));
        if (!ACTIVE_USER_STATUS.equals(status)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, AWARDEE_INACTIVE);
        }
        return awardeeProfile(awardeeId);
    }

    /** 수상자 한 명의 이름·부서. 식별자가 비었거나 계정이 지워졌으면 null 이다. */
    private UserSearchDto awardeeProfile(String awardeeId) {
        return profileOf(awardeeProfiles(Collections.singletonList(awardeeId)), awardeeId);
    }

    private static UserSearchDto profileOf(Map<String, UserSearchDto> profiles, String awardeeId) {
        return awardeeId == null ? null : profiles.get(awardeeId);
    }

    /** 수상자 식별자 → 이름·부서. 빈 식별자는 묻지 않고, 지워진 계정은 결과에 없다. */
    private Map<String, UserSearchDto> awardeeProfiles(Collection<String> awardeeIds) {
        List<String> ids = awardeeIds.stream().filter(StringUtils::hasText).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findProfilesByEsntlIds(ids).stream()
                .collect(Collectors.toMap(UserSearchDto::esntlId, Function.identity(), (first, second) -> first));
    }

    private RewardManageDto convertToDto(RewardManage reward, UserSearchDto awardee) {
        return RewardManageDto.builder()
                .rwrdSn(reward.getRwrdSn())
                .rwardwnrId(reward.getRwrdUserId())
                .rwardwnrNm(awardee == null ? null : awardee.userNm())
                .rwardwnrDeptNm(awardee == null ? null : awardee.deptNm())
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
