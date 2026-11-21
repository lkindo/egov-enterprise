package nuri.foundation.core.board;

/**
 * 게시글 열람 가능 여부를 게시판 도메인에 묻는 포트.
 *
 * <p>스크랩 도메인이 게시판 도메인 서비스를 직접 import 하지 않도록(GAP-ARCH-001) 추상화하며,
 * 구현이 없거나 열람할 수 없는 게시글(미존재·논리삭제·타인 비밀글·비회원 커뮤니티·게시 기간 밖)은
 * 거부한다(fail-closed, H3).
 */
public interface BoardPostAccessPort {

    /** 게시판·게시글 일괄 조회 식별자. */
    record PostRef(String bbsId, long pstSn) {
    }

    /**
     * 현재 인증 주체가 해당 게시판의 활성 게시글을 열람·보관할 수 있는지 검증한다.
     *
     * @param bbsId 게시판 식별자
     * @param pstSn 게시글 일련번호
     */
    void assertScrapablePost(String bbsId, Long pstSn);

    /**
     * 여러 게시글을 한 번에 받아 현재 인증 주체가 열람할 수 있는 대상 집합만 돌려준다.
     */
    default java.util.Set<PostRef> findScrapablePosts(java.util.Collection<PostRef> targets) {
        if (targets == null || targets.isEmpty()) {
            return java.util.Set.of();
        }
        java.util.Set<PostRef> accessible = new java.util.LinkedHashSet<>();
        for (PostRef target : targets) {
            if (target == null || target.bbsId() == null) {
                continue;
            }
            try {
                assertScrapablePost(target.bbsId(), target.pstSn());
                accessible.add(target);
            } catch (RuntimeException ignored) {
                // 개별 대상 열람 거부·미존재는 목록에서 targetAvailable=false 로 접는다.
            }
        }
        return java.util.Collections.unmodifiableSet(accessible);
    }
}
