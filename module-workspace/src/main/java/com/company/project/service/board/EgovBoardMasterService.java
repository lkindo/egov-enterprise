package com.company.project.service.board;

import com.company.project.service.board.dto.BlogDto;
import com.company.project.service.board.dto.BoardMasterDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import java.util.List;

public interface EgovBoardMasterService {

    BoardMasterDto getBoardMaster(@NonNull String bbsId);

    Page<BoardMasterDto> getBoardMasterList(String searchCnd, String searchWrd, @NonNull Pageable pageable);

    void createBoardMaster(BoardMasterDto dto);

    void updateBoardMaster(BoardMasterDto dto);

    void deleteBoardMaster(String bbsId, String userId);

    boolean canUseSatisfaction(String bbsId);

    boolean canUseComment(String bbsId);

    Page<BlogDto> getBlogList(String searchCnd, String searchWrd, @NonNull Pageable pageable);

    BlogDto getBlog(String blogId);

    boolean checkBlogUser(String frstRegisterId);

    void createBlog(BlogDto dto);

    void joinBlog(String blogId, String userId, String mngrAt);

    List<BlogDto> getBlogListPortlet();

    List<BoardMasterDto> getBoardMasterListPortlet();

    List<BoardMasterDto> getBoardMasterListByCommunity(String cmmntyId);
}
