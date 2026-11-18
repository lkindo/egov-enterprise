package nuri.foundation.core.board;

/**
 * 게시글 열람 가능 여부를 게시판 도메인에 묻는 포트.
 *
 * <p>스크랩·댓글 도메인이나 관리자 컨트롤러가 게시판 도메인 서비스를 직접 import 하지
 * 않도록(GAP-ARCH-001, DEC-OPS-280) 추상화하며, 구현이 없거나 열람할 수 없는
 * 게시글(미존재·논리삭제·타인 비밀글·비회원 커뮤니티·게시 기간 밖)은 거부한다(fail-closed, H3).
 */
public interface BoardPostAccessPort {

    /**
     * 현재 인증 주체가 해당 게시판의 활성 게시글을 열람·보관할 수 있는지 검증한다.
     *
     * @param bbsId 게시판 식별자
     * @param pstSn 게시글 일련번호
     */
    void assertScrapablePost(String bbsId, Long pstSn);

    /**
     * 현재 인증 주체가 해당 게시글(댓글 포함)을 열람할 수 있는지 검증한다.
     *
     * @param bbsId 게시판 식별자
     * @param pstSn 게시글 일련번호
     */
    void assertCommentReadAccess(String bbsId, Long pstSn);
}
