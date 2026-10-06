package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;

public interface BoardMasterRepositoryCustom {
    Page<BoardMasterSearchResult> searchBoardMasters(BoardMasterSearchCondition condition, @NonNull Pageable pageable);
}
