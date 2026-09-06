package nuri.business.service.system.content.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.system.content.community.CommunityMemberStatus;
import nuri.business.domain.system.content.community.CommunityUser;

/**
 * 현재 사용자의 특정 커뮤니티 멤버십 상태 — 상세 화면이 가입 버튼의 상태를 정하는 근거.
 *
 * <p>행이 없으면 {@link Status#NONE}, 가입 신청 행이면 {@link Status#REQUESTED}, 승인된 행이면 {@link Status#MEMBER} 다.
 * 어휘 밖의 상태 코드는 {@link Status#UNKNOWN} 으로 돌려주며 화면은 그 경우 가입 버튼을 열지 않는다
 * (존재하는 행 위에 다시 신청하면 409 라 열어 봤자 실패한다).
 */
@Schema(description = "현재 사용자의 커뮤니티 멤버십 상태")
public record CommunityMembershipDto(
        @Schema(description = "커뮤니티 일련번호") Long cmntySn,
        @Schema(description = "멤버십 상태") Status status,
        @Schema(description = "가입(신청)일자 yyyyMMdd — 행이 없으면 null", nullable = true) String joinYmd) {

    public enum Status {
        NONE, REQUESTED, MEMBER, UNKNOWN
    }

    public static CommunityMembershipDto none(Long cmntySn) {
        return new CommunityMembershipDto(cmntySn, Status.NONE, null);
    }

    public static CommunityMembershipDto from(CommunityUser member) {
        Status status = CommunityMemberStatus.fromCode(member.getMbrSttsCd())
                .map(code -> code == CommunityMemberStatus.APPROVED ? Status.MEMBER : Status.REQUESTED)
                .orElse(Status.UNKNOWN);
        return new CommunityMembershipDto(member.getId().getCmntySn(), status, member.getJoinYmd());
    }
}
