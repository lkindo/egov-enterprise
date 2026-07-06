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
}
