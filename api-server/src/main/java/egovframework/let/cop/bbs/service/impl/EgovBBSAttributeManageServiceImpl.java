package egovframework.let.cop.bbs.service.impl;

import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardMasterSearchCondition;
import com.company.project.domain.board.BoardMasterSearchResult;
import egovframework.let.cop.bbs.service.BoardMaster;
import egovframework.let.cop.bbs.service.BoardMasterVO;
import egovframework.let.cop.bbs.service.EgovBBSAttributeManageService;
import egovframework.let.cop.com.service.BoardUseInf;
import egovframework.let.cop.com.service.EgovBBSUseInfoManageService;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("EgovBBSAttributeManageService")
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EgovBBSAttributeManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovBBSAttributeManageService {

    private final BoardMasterRepository boardMasterRepository;

    @Resource(name = "EgovBBSUseInfoManageService")
    private EgovBBSUseInfoManageService bbsUseService;

    @Resource(name = "egovBBSMstrIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    @Transactional
    public void deleteBBSMasterInf(BoardMaster boardMaster) throws Exception {
        // Legacy BoardMaster has bbsId and lastUpdusrId
        com.company.project.domain.board.BoardMaster entity = boardMasterRepository.findById(boardMaster.getBbsId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid BBS ID"));
        entity.delete(boardMaster.getLastUpdusrId());

        BoardUseInf bdUseInf = new BoardUseInf();
        bdUseInf.setBbsId(boardMaster.getBbsId());
        bdUseInf.setLastUpdusrId(boardMaster.getLastUpdusrId());
        bbsUseService.deleteBBSUseInfByBoardId(bdUseInf);
    }

    @Override
    @Transactional
    public String insertBBSMastetInf(BoardMaster boardMaster) throws Exception {
        String bbsId = idgenService.getNextStringId();

        // Use BoardMaster getters. VO fields like frstRegisterId might be in
        // BoardMaster?
        // Checked BoardMaster.java: has frstRegisterId.

        com.company.project.domain.board.BoardMaster entity = com.company.project.domain.board.BoardMaster.builder()
                .bbsId(bbsId)
                .bbsNm(boardMaster.getBbsNm())
                .bbsIntrcn(boardMaster.getBbsIntrcn())
                .bbsTyCode(boardMaster.getBbsTyCode())
                .bbsAttrbCode(boardMaster.getBbsAttrbCode())
                .replyPosblAt(boardMaster.getReplyPosblAt())
                .fileAtchPosblAt(boardMaster.getFileAtchPosblAt())
                .atchPosblFileNumber(boardMaster.getPosblAtchFileNumber())
                .atchPosblFileSize(parseFileSize(boardMaster.getPosblAtchFileSize()))
                .tmplatId(boardMaster.getTmplatId())
                .useAt(boardMaster.getUseAt())
                .frstRegisterId(boardMaster.getFrstRegisterId())
                .build();

        boardMasterRepository.save(entity);
        return bbsId;
    }

    private Long parseFileSize(String size) {
        try {
            return Long.parseLong(size);
        } catch (NumberFormatException | NullPointerException e) {
            return 0L;
        }
    }

    @Override
    public List<BoardMasterVO> selectAllBBSMasteInf(BoardMasterVO boardMasterVO) throws Exception {
        return boardMasterRepository.findAll().stream()
                .filter(m -> "Y".equals(m.getUseAt()))
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> selectBBSMasterInfs(BoardMasterVO boardMasterVO) throws Exception {
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchCnd(boardMasterVO.getSearchCnd());
        condition.setSearchWrd(boardMasterVO.getSearchWrd());
        condition.setUseAt(boardMasterVO.getUseAt());
        condition.setTrgetId(boardMasterVO.getTrgetId());

        Pageable pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1, boardMasterVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<BoardMasterSearchResult> page = boardMasterRepository.searchBoardMasters(condition, pageable);

        Map<String, Object> result = new HashMap<>();
        result.put("resultList",
                page.getContent().stream().map(this::convertToVoFromSearchResult).collect(Collectors.toList()));
        result.put("resultCnt", (int) page.getTotalElements());
        return result;
    }

    private BoardMasterVO convertToVoFromSearchResult(BoardMasterSearchResult entity) {
        BoardMasterVO vo = new BoardMasterVO();
        vo.setBbsId(entity.getBbsId());
        vo.setBbsNm(entity.getBbsNm());
        vo.setBbsTyCode(entity.getBbsTyCode());
        vo.setBbsTyCodeNm(entity.getBbsTyCodeNm());
        vo.setBbsAttrbCode(entity.getBbsAttrbCode());
        vo.setBbsAttrbCodeNm(entity.getBbsAttrbCodeNm());
        vo.setTmplatId(entity.getTmplatId());
        vo.setUseAt(entity.getUseAt());
        vo.setFrstRegisterPnttm(entity.getCreatedDate().toString());
        return vo;
    }

    @Override
    public BoardMasterVO selectBBSMasterInf(BoardMaster boardMaster) throws Exception {
        return boardMasterRepository.findById(boardMaster.getBbsId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    @Transactional
    public void updateBBSMasterInf(BoardMaster boardMaster) throws Exception {
        com.company.project.domain.board.BoardMaster entity = boardMasterRepository.findById(boardMaster.getBbsId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid BBS ID"));

        entity.update(boardMaster.getBbsNm(), boardMaster.getBbsIntrcn(),
                boardMaster.getReplyPosblAt(), boardMaster.getFileAtchPosblAt(),
                boardMaster.getPosblAtchFileNumber(), parseFileSize(boardMaster.getPosblAtchFileSize()),
                boardMaster.getTmplatId(), boardMaster.getUseAt(), boardMaster.getLastUpdusrId());
    }

    @Override
    public void validateTemplate(BoardMasterVO boardMasterVO) throws Exception {
    }

    @Override
    public Map<String, Object> selectNotUsedBdMstrList(BoardMasterVO boardMasterVO) throws Exception {
        return new HashMap<>();
    }

    @Override
    public Map<String, Object> selectBdMstrListByTrget(BoardMasterVO vo) throws Exception {
        return new HashMap<>();
    }

    @Override
    public List<BoardMasterVO> selectAllBdMstrByTrget(BoardMasterVO vo) throws Exception {
        return List.of();
    }

    private BoardMasterVO convertToVo(com.company.project.domain.board.BoardMaster entity) {
        BoardMasterVO vo = new BoardMasterVO();
        vo.setBbsId(entity.getBbsId());
        vo.setBbsNm(entity.getBbsNm());
        vo.setBbsIntrcn(entity.getBbsIntrcn());
        vo.setBbsTyCode(entity.getBbsTyCode());
        vo.setBbsAttrbCode(entity.getBbsAttrbCode());
        vo.setReplyPosblAt(entity.getReplyPosblAt());
        vo.setFileAtchPosblAt(entity.getFileAtchPosblAt());
        vo.setPosblAtchFileNumber(entity.getAtchPosblFileNumber());
        vo.setPosblAtchFileSize(String.valueOf(entity.getAtchPosblFileSize()));
        vo.setTmplatId(entity.getTmplatId());
        vo.setUseAt(entity.getUseAt());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        vo.setFrstRegisterPnttm(entity.getCreatedDate().toString());
        return vo;
    }
}
