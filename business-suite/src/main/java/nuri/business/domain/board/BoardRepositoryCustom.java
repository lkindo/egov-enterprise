package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import java.util.Optional;

public interface BoardRepositoryCustom {
    Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable);

    Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable);

    Optional<BoardDetailResult> findArticleDetail(@NonNull Long id);

    Optional<Board> findByIdCustom(@NonNull Long id);
}
