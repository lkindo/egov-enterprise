package egovframework.com.cop.cmt.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.service.comment.EgovCommentService;
import com.company.project.service.comment.dto.CommentDto;

import egovframework.com.cop.cmt.service.Comment;
import egovframework.com.cop.cmt.service.CommentVO;
import egovframework.com.cop.cmt.service.EgovArticleCommentService;

/**
 * 댓글관리를 위한 서비스 구현 클래스 (JPA 전환 버전)
 */
@Service("EgovArticleCommentService")
@org.springframework.context.annotation.Lazy
public class EgovArticleCommentServiceImpl extends EgovAbstractServiceImpl implements EgovArticleCommentService {

	@Resource(name = "egovCommentService")
	private EgovCommentService egovCommentService;

	@Resource(name = "egovBoardMasterService")
	private EgovBoardMasterService boardMasterService;

	/**
	 * 댓글 사용 가능 여부를 확인한다.
	 */
	@Override
	public boolean canUseComment(String bbsId) throws Exception {
		BoardMasterDto options = boardMasterService.getBoardMaster(bbsId);
		if (options == null) {
			return false;
		}
		return "Y".equals(options.getCommentAt());
	}

	@Override
	public Map<String, Object> selectArticleCommentList(CommentVO commentVO) {
		Page<CommentDto> page = egovCommentService.getCommentList(
				commentVO.getBbsId(),
				commentVO.getNttId(),
				PageRequest.of(commentVO.getSubFirstIndex() / commentVO.getSubRecordCountPerPage(),
						commentVO.getSubRecordCountPerPage()));

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	@Override
	public void insertArticleComment(Comment comment) throws FdlException {
		CommentDto dto = CommentDto.builder()
				.nttId(comment.getNttId())
				.bbsId(comment.getBbsId())
				.wrterId(comment.getWrterId())
				.wrterNm(comment.getWrterNm())
				.password(comment.getCommentPassword())
				.commentCn(comment.getCommentCn())
				.build();
		egovCommentService.createComment(comment.getWrterId(), dto);
	}

	@Override
	public void deleteArticleComment(CommentVO commentVO) {
		// commentVO.getCommentNo() 가 현대화된 ID (Long) 인지 확인 필요. legacy는 String임.
		egovCommentService.deleteComment(Long.parseLong(commentVO.getCommentNo()), commentVO.getLastUpdusrId());
	}

	@Override
	public CommentVO selectArticleCommentDetail(CommentVO commentVO) {
		CommentDto dto = egovCommentService.getComment(Long.parseLong(commentVO.getCommentNo()));
		return toVO(dto);
	}

	@Override
	public void updateArticleComment(Comment comment) {
		egovCommentService.updateComment(Long.parseLong(comment.getCommentNo()), comment.getCommentCn(),
				comment.getLastUpdusrId());
	}

	private CommentVO toVO(CommentDto dto) {
		if (dto == null)
			return null;
		CommentVO vo = new CommentVO();
		vo.setCommentNo(dto.getCommentNo().toString());
		vo.setNttId(dto.getNttId());
		vo.setBbsId(dto.getBbsId());
		vo.setWrterId(dto.getWrterId());
		vo.setWrterNm(dto.getWrterNm());
		vo.setCommentPassword(dto.getPassword());
		vo.setCommentCn(dto.getCommentCn());
		vo.setUseAt(dto.getUseAt());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		// 날짜 변환 등 추가 가능
		return vo;
	}
}
