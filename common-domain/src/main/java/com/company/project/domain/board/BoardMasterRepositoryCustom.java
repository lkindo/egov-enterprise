package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

public interface BoardMasterRepositoryCustom {
    Page<BoardMasterSearchResult> searchBoardMasters(BoardMasterSearchCondition condition, Pageable pageable);

    Optional<BoardMasterDetailResult> findBoardMasterDetail(String bbsId, String uniqId);
}
