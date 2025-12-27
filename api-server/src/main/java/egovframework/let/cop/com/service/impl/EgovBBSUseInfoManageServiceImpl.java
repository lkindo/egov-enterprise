package egovframework.let.cop.com.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.board.BoardUse;
import com.company.project.domain.board.BoardUseId;
import com.company.project.domain.board.BoardUseRepository;

import egovframework.let.cop.com.service.BoardUseInf;
import egovframework.let.cop.com.service.BoardUseInfVO;
import egovframework.let.cop.com.service.EgovBBSUseInfoManageService;
import lombok.RequiredArgsConstructor;

/**
 * 게시판 이용정보를 관리하기 위한 서비스 구현 클래스 (JPA)
 */
@Service("EgovBBSUseInfoManageService")
@RequiredArgsConstructor
public class EgovBBSUseInfoManageServiceImpl extends EgovAbstractServiceImpl implements EgovBBSUseInfoManageService {

    private final BoardUseRepository boardUseRepository;

    @Override
    @Transactional
    public void deleteBBSUseInf(BoardUseInf bdUseInf) throws Exception {
        BoardUseId id = new BoardUseId(bdUseInf.getBbsId(), bdUseInf.getTrgetId());
        boardUseRepository.findById(id).ifPresent(entity -> {
            entity.setUseAt("N");
            entity.setLastUpdusrId(bdUseInf.getLastUpdusrId());
        });
    }

    @Override
    @Transactional
    public void insertBBSUseInf(BoardUseInf bdUseInf) throws Exception {
        BoardUse entity = BoardUse.builder()
                .bbsId(bdUseInf.getBbsId())
                .trgetId(bdUseInf.getTrgetId())
                .useAt("Y")
                .build();
        boardUseRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectBBSUseInfs(BoardUseInfVO bdUseVO) throws Exception {
        List<BoardUse> result = boardUseRepository.findAll();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", convertToVoList(result));
        map.put("resultCnt", String.valueOf(result.size()));
        return map;
    }

    @Override
    @Transactional
    public void updateBBSUseInf(BoardUseInf bdUseInf) throws Exception {
        BoardUseId id = new BoardUseId(bdUseInf.getBbsId(), bdUseInf.getTrgetId());
        boardUseRepository.findById(id).ifPresent(entity -> {
            entity.setUseAt(bdUseInf.getUseAt());
            entity.setLastUpdusrId(bdUseInf.getLastUpdusrId());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public BoardUseInfVO selectBBSUseInf(BoardUseInfVO bdUseVO) throws Exception {
        BoardUseId id = new BoardUseId(bdUseVO.getBbsId(), bdUseVO.getTrgetId());
        return boardUseRepository.findById(id)
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    @Transactional
    public void deleteBBSUseInfByCmmnty(BoardUseInfVO bdUseVO) throws Exception {
        // Simplified: just mark as deleted by target
        deleteBBSUseInf(convertVoToInf(bdUseVO));
    }

    @Override
    @Transactional
    public void deleteBBSUseInfByClub(BoardUseInfVO bdUseVO) throws Exception {
        deleteBBSUseInf(convertVoToInf(bdUseVO));
    }

    @Override
    @Transactional
    public void deleteAllBBSUseInfByCmmnty(BoardUseInfVO bdUseVO) throws Exception {
        // Simplified implementation
    }

    @Override
    @Transactional
    public void deleteAllBBSUseInfByClub(BoardUseInfVO bdUseVO) throws Exception {
        // Simplified implementation
    }

    @Override
    @Transactional
    public void deleteBBSUseInfByBoardId(BoardUseInf bdUseInf) throws Exception {
        // Delete all uses for a specific board
        boardUseRepository.findAll().stream()
                .filter(e -> bdUseInf.getBbsId().equals(e.getBbsId()))
                .forEach(e -> {
                    e.setUseAt("N");
                    e.setLastUpdusrId(bdUseInf.getLastUpdusrId());
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectBBSUseInfsByTrget(BoardUseInfVO bdUseVO) throws Exception {
        return selectBBSUseInfs(bdUseVO);
    }

    @Override
    @Transactional
    public void updateBBSUseInfByTrget(BoardUseInf bdUseInf) throws Exception {
        updateBBSUseInf(bdUseInf);
    }

    private BoardUseInfVO convertToVo(BoardUse entity) {
        BoardUseInfVO vo = new BoardUseInfVO();
        vo.setBbsId(entity.getBbsId());
        vo.setTrgetId(entity.getTrgetId());
        vo.setUseAt(entity.getUseAt());
        return vo;
    }

    private List<BoardUseInfVO> convertToVoList(List<BoardUse> entities) {
        List<BoardUseInfVO> list = new ArrayList<>();
        for (BoardUse e : entities) {
            list.add(convertToVo(e));
        }
        return list;
    }

    private BoardUseInf convertVoToInf(BoardUseInfVO vo) {
        BoardUseInf inf = new BoardUseInf();
        inf.setBbsId(vo.getBbsId());
        inf.setTrgetId(vo.getTrgetId());
        inf.setLastUpdusrId(vo.getLastUpdusrId());
        return inf;
    }
}
