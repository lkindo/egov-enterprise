package nuri.business.core.softdelete;

import java.util.List;
import java.util.Optional;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 서비스 경계를 한 번 더 지난 뒤의 조회가 처음 조회와 같은 행을 보는지 확인하는 시험용 서비스. */
@Service
@Transactional
public class SoftDeleteTestService {

    @Autowired
    private BoardRepository boardRepository;

    public List<Board> getAllBoards() {
        return boardRepository.findAll();
    }

    /** 다른 서비스 메서드를 먼저 부른 뒤 관리자 복구·감사 경로의 상세 조회를 한다(BoardService#getPostDetail 과 같은 순서). */
    public Optional<BoardDetailResult> readIncludingDeletedAfterNestedCall(
            SoftDeleteTestService selfProxy, String bbsId, Long pstSn) {
        selfProxy.getAllBoards();
        return boardRepository.findArticleDetailIncludingDeleted(bbsId, pstSn);
    }

    public List<Board> getAllBoardsAfterNestedCall(SoftDeleteTestService selfProxy) {
        selfProxy.getAllBoards();
        return boardRepository.findAll();
    }
}
