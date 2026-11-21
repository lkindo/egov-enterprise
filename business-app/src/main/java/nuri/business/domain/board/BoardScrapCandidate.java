package nuri.business.domain.board;

/**
 * 스크랩 목록 가용성 일괄 판정을 위한 게시글 최소 프로젝션.
 */
public record BoardScrapCandidate(
        String bbsId,
        Long pstSn,
        Long cmntySn,
        String userId,
        String scrtYn,
        String pstBgngYmd,
        String pstEndYmd) {
}
