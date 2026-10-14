package nuri.business.core.softdelete;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SoftDeleteTestService {
    
    @Autowired
    private BoardRepository boardRepository;

    public List<Board> getAllBoards() {
        return boardRepository.findAll();
    }

    @DisableSoftDelete
    public List<Board> getAllBoardsWithDeleted() {
        return boardRepository.findAll();
    }

    @DisableSoftDelete
    public List<Board> getAllBoardsAfterNestedRegularCall(SoftDeleteTestService selfProxy) {
        // 중첩된 일반 @Service 호출이 끝난 뒤에도 외곽 @DisableSoftDelete 문맥의 비활성 상태가 유지되어야 한다.
        selfProxy.getAllBoards();
        return boardRepository.findAll();
    }
}
