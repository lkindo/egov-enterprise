package nuri.foundation.core.community;

/**
 * 커뮤니티 귀속 게시판의 접근 판정을 커뮤니티 도메인에 묻는 포트.
 *
 * <p>{@code tb_bbs_master.cmnty_sn} 은 게시판을 커뮤니티에 귀속시키지만 물리 FK 가 없다(V2_0).
 * 그 게시판의 글은 <b>승인된 회원만</b> 볼 수 있어야 하는데, 게시판 도메인이 커뮤니티 도메인을 직접
 * import 하면 서비스 계층 교차 결합(GAP-ARCH-001)이 늘어난다. 템플릿 참조 포트
 * ({@code TemplateReferenceContributor}, DEC-OPS-047)와 같은 방식으로 판정 소유권은 커뮤니티에 두고
 * 게시판은 이 포트만 본다.
 *
 * <p><b>구현이 없을 때는 열지 않는다.</b> 커뮤니티 도메인이 base projection 에서 빠진 파생 제품에는
 * 이 빈이 없는데, 그때 남아 있는 {@code cmnty_sn} 값을 "판정할 수 없으니 통과" 로 다루면 회원 전용
 * 게시판이 전원 공개로 뒤집힌다. 호출부는 포트 부재를 <b>거부</b>로 해석한다(fail-closed, H3).
 */
public interface CommunityBoardAccessPort {

    /**
     * {@code esntlId} 사용자가 해당 커뮤니티의 <b>승인된 회원</b>인지. 가입 신청 상태는 회원이 아니다.
     *
     * @param cmntySn 커뮤니티 일련번호
     * @param esntlId 사용자 PK(로그인 ID 가 아니다 — {@code tb_cmnty_user_map.user_id} 축)
     */
    boolean isApprovedMember(Long cmntySn, String esntlId);

    /** 해당 커뮤니티가 존재하는지. 게시판을 없는 커뮤니티에 귀속시키는 것을 막는 데 쓴다. */
    boolean exists(Long cmntySn);
}
