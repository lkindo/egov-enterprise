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
    Page<java.lang.Object> getBlogList(Object o1, Object o2, Pageable pageable);
    java.lang.Object getBlog(String id);
    void createBlog(Object dto);
    void joinBlog(String s1, String s2, String s3);
    boolean checkBlogUser(String userId);
    List<java.lang.Object> getBlogListPortlet();
}
