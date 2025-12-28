package egovframework.let.cop.bbs.service.impl;

import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardId;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.board.BoardSearchCondition;
import egovframework.let.cop.bbs.service.BoardVO;
import egovframework.let.cop.bbs.service.EgovBBSManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("EgovBBSManageService")
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EgovBBSManageServiceImpl extends EgovAbstractServiceImpl implements EgovBBSManageService {

    private final BoardRepository boardRepository;
    private final BoardMasterRepository boardMasterRepository;

    @Resource(name = "egovFileService")
    private com.company.project.service.file.EgovFileService egovFileService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Override
    @Transactional
    public void deleteBoardArticle(egovframework.let.cop.bbs.service.Board board) throws Exception {
        Board entity = boardRepository.findByIdCustom(new BoardId(board.getNttId(), board.getBbsId()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid NTT ID: " + board.getNttId() + " for BBS ID: " + board.getBbsId()));

        entity.delete(board.getLastUpdusrId());

        if (board.getAtchFileId() != null && !board.getAtchFileId().isEmpty()) {
            egovFileService.deleteFiles(board.getAtchFileId());
        }
    }

    @Override
    @Transactional
    public void insertBoardArticle(egovframework.let.cop.bbs.service.Board board) throws Exception {
        Long nttId = boardRepository.findMaxNttId() + 1;
        Long sortOrdr;
        Long nttNo;
        String parnts = "0";
        String replyLc = "0";
        String replyAt = board.getReplyAt();

        if ("Y".equals(replyAt)) {
            parnts = board.getParnts();
            replyLc = String.valueOf(Integer.parseInt(board.getReplyLc()) + 1);
            sortOrdr = board.getSortOrdr();
            nttNo = boardRepository.findMaxNttNo(board.getBbsId(), sortOrdr) + 1;
        } else {
            sortOrdr = boardRepository.findMaxSortOrdr(board.getBbsId()) + 1;
            nttNo = 1L;
            replyAt = "N";
        }

        Board entity = Board.builder()
                .nttId(nttId)
                .bbsId(board.getBbsId())
                .nttSj(board.getNttSj())
                .nttCn(board.getNttCn())
                .replyAt(replyAt)
                .parnts(Long.parseLong(parnts))
                .replyLc(Integer.parseInt(replyLc))
                .sortOrdr(sortOrdr)
                .nttNo(nttNo)
                .inqireCo(0)
                .useAt("Y")
                .ntceBgnde(board.getNtceBgnde())
                .ntceEndde(board.getNtceEndde())
                .ntcrId(board.getNtcrId())
                .ntcrNm(board.getNtcrNm())
                .password(board.getPassword())
                .atchFileId(board.getAtchFileId())
                .frstRegisterId(board.getFrstRegisterId())
                .build();

        boardRepository.save(entity);
    }

    @Override
    @Transactional
    public BoardVO selectBoardArticle(BoardVO boardVO) throws Exception {
        if (boardVO.isPlusCount()) {
            Board entity = boardRepository.findByIdCustom(new BoardId(boardVO.getNttId(), boardVO.getBbsId()))
                    .orElse(null);
            if (entity != null) {
                entity.increaseInqireCo();
            }
        }

        return boardRepository.findByIdCustom(new BoardId(boardVO.getNttId(), boardVO.getBbsId()))
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public Map<String, Object> selectBoardArticles(BoardVO boardVO, String attrbFlag) throws Exception {

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(boardVO.getBbsId());
        condition.setSearchCnd(boardVO.getSearchCnd());
        condition.setSearchWrd(boardVO.getSearchWrd());
        condition.setUseAt(boardVO.getUseAt());

        Pageable pageable = PageRequest.of(boardVO.getPageIndex() - 1, boardVO.getPageUnit());
        Page<Board> page = boardRepository.search(condition, pageable);

        List<BoardVO> list = page.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());

        if ("BBSA01".equals(attrbFlag)) {
            String today = EgovDateUtil.getToday();
            for (BoardVO vo : list) {
                if (vo.getNtceBgnde() != null && !vo.getNtceBgnde().isEmpty()) {
                    if (EgovDateUtil.getDaysDiff(today, vo.getNtceBgnde()) > 0
                            || EgovDateUtil.getDaysDiff(today, vo.getNtceEndde()) < 0) {
                        vo.setIsExpired("Y");
                    }
                }
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", list);
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));
        return map;
    }

    @Override
    @Transactional
    public void updateBoardArticle(egovframework.let.cop.bbs.service.Board board) throws Exception {
        Board entity = boardRepository.findByIdCustom(new BoardId(board.getNttId(), board.getBbsId()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid NTT ID: " + board.getNttId() + " for BBS ID: " + board.getBbsId()));

        entity.update(board.getNttSj(), board.getNttCn(), board.getNtcrId(), board.getNtcrNm(),
                board.getPassword(), board.getNtceBgnde(), board.getNtceEndde(),
                board.getAtchFileId(), board.getLastUpdusrId());
    }

    @Override
    public void deleteGuestList(BoardVO boardVO) throws Exception {
        Board entity = boardRepository.findByIdCustom(new BoardId(boardVO.getNttId(), boardVO.getBbsId())).orElse(null);
        if (entity != null)
            entity.delete(boardVO.getLastUpdusrId());
    }

    @Override
    public Map<String, Object> selectGuestList(BoardVO boardVO) throws Exception {
        return selectBoardArticles(boardVO, "");
    }

    @Override
    public String getPasswordInf(egovframework.let.cop.bbs.service.Board board) throws Exception {
        return boardRepository.findByIdCustom(new BoardId(board.getNttId(), board.getBbsId()))
                .map(Board::getPassword)
                .orElse("");
    }

    private BoardVO convertToVo(Board entity) {
        BoardVO vo = new BoardVO();
        vo.setNttId(entity.getNttId());
        vo.setBbsId(entity.getBbsId());
        vo.setNttSj(entity.getNttSj());
        vo.setNttCn(entity.getNttCn());
        vo.setNtcrId(entity.getNtcrId());
        vo.setNtcrNm(entity.getNtcrNm());
        vo.setInqireCo(entity.getInqireCo());
        vo.setUseAt(entity.getUseAt());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        if (entity.getCreatedDate() != null)
            vo.setFrstRegisterPnttm(entity.getCreatedDate().toString());
        vo.setNtceBgnde(entity.getNtceBgnde());
        vo.setNtceEndde(entity.getNtceEndde());
        vo.setAtchFileId(entity.getAtchFileId());
        vo.setParnts(String.valueOf(entity.getParnts()));
        vo.setReplyLc(String.valueOf(entity.getReplyLc()));
        vo.setSortOrdr(entity.getSortOrdr());
        return vo;
    }
}
