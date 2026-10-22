package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;

public interface BoardMasterRepositoryCustom {
    Page<BoardMasterSearchResult> searchBoardMasters(BoardMasterSearchCondition condition, @NonNull Pageable pageable);

    /**
     * 사용 중인 게시판 전부를 마스터 목록과 같은 안정 순서(만든 날 최신순, 같으면 ID 순)로 읽는다(ADR-0040 결정 11).
     * <b>인가를 하지 않는다</b> — 커뮤니티 귀속 거르기는 호출부({@code BoardService#getBoardOptions})가 한다.
     */
    java.util.List<BoardOptionRow> findActiveBoardOptions();
}
