package egovframework.com.cop.cmy.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;

import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.cmy.service.EgovCommuBBSMasterService;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

@Service("EgovCommuBBSMasterService")
@RequiredArgsConstructor
public class EgovCommuBBSMasterServiceImpl extends EgovAbstractServiceImpl implements EgovCommuBBSMasterService {

	private final EgovBoardMasterService egovBoardMasterService;

	@Override
	public List<BoardMasterVO> selectCommuBBSMasterListMain(BoardMasterVO boardMasterVO) {
		// Modern approach: use EgovBoardMasterService
		List<BoardMasterDto> dtos = egovBoardMasterService.getBoardMasterListByCommunity(boardMasterVO.getCmmntyId());

		return dtos.stream()
				.map(this::convertToVO)
				.collect(Collectors.toList());
	}

	private BoardMasterVO convertToVO(BoardMasterDto dto) {
		BoardMasterVO vo = new BoardMasterVO();
		vo.setBbsId(dto.getBbsId());
		vo.setBbsNm(dto.getBbsNm());
		vo.setBbsTyCode(dto.getBbsTyCode());
		vo.setTmplatId(dto.getTmplatId());
		vo.setUseAt(dto.getUseAt());
		// Map other fields as necessary, mainly those used in the list
		return vo;
	}
}
