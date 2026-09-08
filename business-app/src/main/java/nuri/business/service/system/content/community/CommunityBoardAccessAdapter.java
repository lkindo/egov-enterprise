package nuri.business.service.system.content.community;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.system.content.community.CommunityMemberStatus;
import nuri.business.domain.system.content.community.CommunityRepository;
import nuri.business.domain.system.content.community.CommunityUserId;
import nuri.business.domain.system.content.community.CommunityUserRepository;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 커뮤니티 귀속 게시판 접근 판정의 커뮤니티 쪽 구현.
 *
 * <p>판정 규칙은 하나다 — {@code tb_cmnty_user_map} 에 그 사용자의 행이 있고 상태가
 * {@link CommunityMemberStatus#APPROVED} 여야 한다. 가입 신청({@code A})은 회원이 아니다.
 * 상태 어휘는 {@link CommunityMemberStatus} 가 정본이며 어휘 밖 코드는 회원이 아니다.
 */
@Component
@RequiredArgsConstructor
public class CommunityBoardAccessAdapter implements CommunityBoardAccessPort {

    private final CommunityUserRepository communityUserRepository;
    private final CommunityRepository communityRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean isApprovedMember(Long cmntySn, String esntlId) {
        if (cmntySn == null || esntlId == null || esntlId.isBlank()) {
            return false;
        }
        return communityUserRepository.findById(new CommunityUserId(cmntySn, esntlId))
                .map(member -> CommunityMemberStatus.APPROVED.matches(member.getMbrSttsCd()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean exists(Long cmntySn) {
        return cmntySn != null && communityRepository.existsById(cmntySn);
    }
}
