package nuri.business.service.board;

import nuri.business.service.board.dto.BoardMasterDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovBoardMasterService {
    Page<BoardMasterDto> getBoardMasterList(String searchCondition, String searchKeyword, Pageable pageable);
    List<BoardMasterDto> getBoardMasterList(String searchCondition, String searchKeyword);
    BoardMasterDto getBoardMaster(String bbsId);
    String createBoardMaster(String userId, BoardMasterDto dto);
    void updateBoardMaster(String userId, BoardMasterDto dto);
    void deleteBoardMaster(String userId, String bbsId);
    
    boolean canUseSatisfaction(String bbsId);
    boolean canUseComment(String bbsId);
    Page<nuri.business.service.board.dto.BlogDto> getBlogList(String searchCondition, String searchKeyword, Pageable pageable);
    nuri.business.service.board.dto.BlogDto getBlog(String blogId);
    void createBlog(String userId, nuri.business.service.board.dto.BlogDto dto);
    void joinBlog(String blogId, String userId, String mngrYn);
    boolean checkBlogUser(String userId);
    List<nuri.business.service.board.dto.BlogDto> getBlogListPortlet();
}
