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

    Optional<BoardDetailResult> findPublicArticleDetail(@NonNull String bbsId, @NonNull Long pstSn);

    Optional<Board> findByIdCustom(@NonNull Long pstSn);
}
