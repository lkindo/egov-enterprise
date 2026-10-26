package nuri.foundation.core.community;

import java.util.Optional;

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

    /**
     * 게시판 운영 화면이 귀속 커뮤니티를 알릴 때 쓰는 요약(이름·이용 가능 여부).
     *
     * <p>[2026-10-26 ADR-0043 결정 3] 공개 준비 점검은 귀속 게시판의 입구를 '사용 중인 커뮤니티 화면'으로 센다. 귀속
     * 커뮤니티가 사용 중지면 이용자가 들어올 입구가 없다. 게시판은 커뮤니티 표를 직접 읽지 않고(GAP-ARCH-001) 이 포트로 묻는다.
     *
     * <p><b>모르면 비운다.</b> 커뮤니티가 없거나 구현이 요약을 주지 않으면 {@link Optional#empty()} 다. 호출부는 이것을
     * '확인 불가' 로 다루고 입구가 있다고 추정하지 않는다(fail-closed). 기본 구현은 늘 비운다 — 이 메서드를 모르는 구현이
     * 있어도 확인 불가로 끝난다.
     *
     * @param cmntySn 커뮤니티 일련번호
     */
    default Optional<CommunitySummary> summary(Long cmntySn) {
        return Optional.empty();
    }

    /**
     * 커뮤니티 요약.
     *
     * @param cmntyNm 커뮤니티 이름(비어 있을 수 있다)
     * @param inUse   이용자가 커뮤니티 화면을 열 수 있는지 — 사용 중이고 정식 등록된 커뮤니티만 true 다
     *                (이용자 상세 화면과 같은 판정)
     */
    record CommunitySummary(String cmntyNm, boolean inUse) {
    }
}
