package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import java.util.Optional;

public interface BoardMasterRepositoryCustom {
    Page<BoardMasterSearchResult> searchBoardMasters(BoardMasterSearchCondition condition, @NonNull Pageable pageable);

    Optional<BoardMasterDetailResult> findBoardMasterDetail(@NonNull String bbsId, String uniqId);
}
