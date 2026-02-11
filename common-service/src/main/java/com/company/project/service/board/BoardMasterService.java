package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardMasterSearchCondition;
import com.company.project.domain.board.BoardMasterSearchResult;
import com.company.project.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("egovBoardMasterService")
public class BoardMasterService extends EgovAbstractServiceImpl implements EgovBoardMasterService {

    private final BoardMasterRepository boardMasterRepository;
    private final EgovIdGnrService idgenService;

    public BoardMasterService(BoardMasterRepository boardMasterRepository,
            @Qualifier("egovBBSMstrIdGnrService") EgovIdGnrService idgenService) {
        this.boardMasterRepository = boardMasterRepository;
        this.idgenService = idgenService;
    }

    @Override
    @Transactional(readOnly = true)
    public BoardMasterDto getBoardMaster(String bbsId) {
        BoardMaster entity = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BoardMasterDto.from(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BoardMasterDto> getBoardMasterList(String searchCnd, String searchWrd, Pageable pageable) {
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchCnd(searchCnd);
        condition.setSearchWrd(searchWrd);

        return boardMasterRepository.searchBoardMasters(condition, pageable)
                .map(this::convertSearchResultToDto);
    }

    private BoardMasterDto convertSearchResultToDto(BoardMasterSearchResult r) {
        return BoardMasterDto.builder()
                .bbsId(r.getBbsId())
                .bbsNm(r.getBbsNm())
                .bbsTyCode(r.getBbsTyCode())
                .bbsAttrbCode(r.getBbsAttrbCode())
                .tmplatId(r.getTmplatId())
                .useAt(r.getUseAt())
                .build();
    }

    @Override
    @Transactional
    public void createBoardMaster(BoardMasterDto dto) {
        String bbsId;
        try {
            bbsId = idgenService.getNextStringId();
        } catch (Exception e) {
            throw new BusinessException("Failed to generate ID", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        BoardMaster entity = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsNm(dto.getBbsNm())
                .bbsIntrcn(dto.getBbsIntrcn())
                .bbsTyCode(dto.getBbsTyCode())
                .bbsAttrbCode(dto.getBbsAttrbCode())
                .replyPosblAt(dto.getReplyPosblAt())
                .fileAtchPosblAt(dto.getFileAtchPosblAt())
                .atchPosblFileNumber(dto.getAtchPosblFileNumber())
                .atchPosblFileSize(dto.getAtchPosblFileSize())
                .tmplatId(dto.getTmplatId())
                .useAt("Y")
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getFrstRegisterId())
                .cmmntyId(dto.getCmmntyId())
                .blogId(dto.getBlogId())
                .blogAt(dto.getBlogAt() != null ? dto.getBlogAt() : "N")
                .commentAt(dto.getCommentAt() != null ? dto.getCommentAt() : "N")
                .stsfdgAt(dto.getStsfdgAt() != null ? dto.getStsfdgAt() : "N")
                .build();

        boardMasterRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateBoardMaster(BoardMasterDto dto) {
        BoardMaster entity = boardMasterRepository.findById(dto.getBbsId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(
                dto.getBbsNm(),
                dto.getBbsIntrcn(),
                dto.getReplyPosblAt(),
                dto.getFileAtchPosblAt(),
                dto.getAtchPosblFileNumber(),
                dto.getAtchPosblFileSize(),
                dto.getTmplatId(),
                dto.getUseAt(),
                dto.getLastUpdusrId(),
                dto.getCommentAt(),
                dto.getStsfdgAt());
    }

    @Override
    @Transactional
    public void deleteBoardMaster(String bbsId, String userId) {
        BoardMaster entity = boardMasterRepository.findById(bbsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.delete(userId);
    }

    @Override
    public boolean canUseSatisfaction(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(bm -> "Y".equals(bm.getStsfdgAt()))
                .orElse(false);
    }

    @Override
    public boolean canUseComment(String bbsId) {
        return boardMasterRepository.findById(bbsId)
                .map(bm -> "Y".equals(bm.getCommentAt()))
                .orElse(false);
    }
}
