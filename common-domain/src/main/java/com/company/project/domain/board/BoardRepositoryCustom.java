package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

public interface BoardRepositoryCustom {
    Page<Board> search(BoardSearchCondition condition, Pageable pageable);

    Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, Pageable pageable);

    Optional<BoardDetailResult> findArticleDetail(BoardId id);

    Optional<Board> findByIdCustom(BoardId id);
}
