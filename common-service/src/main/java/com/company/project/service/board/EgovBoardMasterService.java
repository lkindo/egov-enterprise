package com.company.project.service.board;

import com.company.project.service.board.dto.BoardMasterDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovBoardMasterService {

    BoardMasterDto getBoardMaster(String bbsId);

    Page<BoardMasterDto> getBoardMasterList(String searchCnd, String searchWrd, Pageable pageable);

    void createBoardMaster(BoardMasterDto dto);

    void updateBoardMaster(BoardMasterDto dto);

    void deleteBoardMaster(String bbsId, String userId);
}
