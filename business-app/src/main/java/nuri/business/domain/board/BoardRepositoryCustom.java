package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import java.util.Optional;

public interface BoardRepositoryCustom {
    Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable);

    Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable);

    BoardStatsResult aggregateVisibleStats(@NonNull BoardSearchCondition condition);

    Page<BoardSearchResult> searchPublicFaqArticles(
            @NonNull String bbsId, String keyword, @NonNull Pageable pageable);

    Optional<BoardDetailResult> findActiveArticleDetail(@NonNull String bbsId, @NonNull Long pstSn);

    /**
     * 논리 삭제(useYn='N')된 게시글까지 포함해 상세를 조회한다.
     *
     * <p>관리자의 복구·감사 경로 전용이다. <b>이 메서드 자체는 인가를 하지 않으므로</b>
     * 호출부가 관리자 권한을 먼저 판정해야 한다(BoardService#getPostDetail).
     * 일반 조회는 {@link #findActiveArticleDetail} 을 쓴다.
     */
    Optional<BoardDetailResult> findArticleDetailIncludingDeleted(@NonNull String bbsId, @NonNull Long pstSn);

    Optional<BoardDetailResult> findPublicArticleDetail(@NonNull String bbsId, @NonNull Long pstSn);

    Optional<Board> findByIdCustom(@NonNull Long pstSn);
}
