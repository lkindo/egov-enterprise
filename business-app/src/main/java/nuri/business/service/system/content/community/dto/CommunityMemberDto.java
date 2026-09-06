package nuri.business.service.system.content.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.system.content.community.CommunityMemberStatus;
import nuri.business.domain.system.content.community.CommunityUser;

/**
 * 관리자용 커뮤니티 회원·가입 신청 행.
 *
 * <p>{@code userId} 는 {@code tb_cmnty_user_map.user_id} 로, 로그인 ID 가 아니라 esntlId 다
 * (V2_10 주석 — {@code getUsername() == esntlId}). 이름은 코어 사용자 도메인에서 해석하며 사용자를 찾지 못하면
 * {@code null} 로 둔다 — 직접 DML 로 남은 고아 행 하나 때문에 목록 전체가 죽지 않게 하기 위해서다.
 * 연락처는 싣지 않는다(H3).
 */
@Schema(description = "커뮤니티 회원·가입 신청")
public record CommunityMemberDto(
        @Schema(description = "커뮤니티 일련번호") Long cmntySn,
        @Schema(description = "사용자 식별자(esntlId)") String userId,
        @Schema(description = "사용자 이름 — 사용자를 찾지 못하면 null", nullable = true) String userNm,
        @Schema(description = "멤버십 상태 — REQUESTED(가입 신청)·APPROVED(회원). 어휘 밖 코드는 null", nullable = true)
        CommunityMemberStatus status,
        @Schema(description = "원본 상태 코드(mbr_stts_cd)") String mbrSttsCd,
        @Schema(description = "관리자 여부(Y/N)") String mngrYn,
        @Schema(description = "가입(신청)일자 yyyyMMdd", nullable = true) String joinYmd,
        @Schema(description = "사용 여부(Y/N)") String useYn) {

    public static CommunityMemberDto from(CommunityUser member, String userNm) {
        return new CommunityMemberDto(
                member.getId().getCmntySn(),
                member.getId().getUserId(),
                userNm,
                CommunityMemberStatus.fromCode(member.getMbrSttsCd()).orElse(null),
                member.getMbrSttsCd(),
                member.getMngrYn(),
                member.getJoinYmd(),
                member.getUseYn());
    }
}
