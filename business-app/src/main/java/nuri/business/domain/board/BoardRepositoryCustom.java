package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;
import java.util.Optional;

public interface BoardRepositoryCustom {
    Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable);

    Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable);

    BoardStatsResult aggregateVisibleStats(@NonNull BoardSearchCondition condition);

    /** @param today 게시 기간(시작일·종료일) 판정 기준일(yyyyMMdd, Asia/Seoul) */
    Page<BoardSearchResult> searchPublicFaqArticles(
            @NonNull String bbsId, String keyword, @NonNull String today, @NonNull Pageable pageable);

    Optional<BoardDetailResult> findActiveArticleDetail(@NonNull String bbsId, @NonNull Long pstSn);

    /**
     * 논리 삭제(useYn='N')된 게시글까지 포함해 상세를 조회한다.
     *
     * <p>관리자의 복구·감사 경로 전용이다. <b>이 메서드 자체는 인가를 하지 않으므로</b>
     * 호출부가 관리자 권한을 먼저 판정해야 한다(BoardService#getPostDetail).
     * 일반 조회는 {@link #findActiveArticleDetail} 을 쓴다.
     */
    Optional<BoardDetailResult> findArticleDetailIncludingDeleted(@NonNull String bbsId, @NonNull Long pstSn);

    /**
     * 사용 안 함 게시판(마스터 useYn='N')의 글 상세. [2026-10-23 ADR-0040 결정 1] 운영자 열람 경로 전용이다.
     *
     * <p><b>이 메서드 자체는 인가를 하지 않는다</b> — 호출부가 조회 대행 권한(BOARD_READ_ALL)과 게시판의 사용 안 함을 먼저
     * 판정해야 한다(BoardService#getPostDetail·assertCommentReadAccess). 사용 중인 게시판의 글은 돌려주지 않는다.
     *
     * @param includeDeleted 논리 삭제(useYn='N')된 글까지 포함할지
     */
    Optional<BoardDetailResult> findArticleDetailOnInactiveBoard(@NonNull String bbsId, @NonNull Long pstSn, boolean includeDeleted);

    /** @param today 게시 기간(시작일·종료일) 판정 기준일(yyyyMMdd, Asia/Seoul) */
    Optional<BoardDetailResult> findPublicArticleDetail(@NonNull String bbsId, @NonNull Long pstSn, @NonNull String today);
}
