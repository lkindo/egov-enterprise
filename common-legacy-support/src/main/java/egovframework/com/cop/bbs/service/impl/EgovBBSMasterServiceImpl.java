package egovframework.com.cop.bbs.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BlogDto;
import com.company.project.service.board.dto.BoardMasterDto;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cop.bbs.service.Blog;
import egovframework.com.cop.bbs.service.BlogUser;
import egovframework.com.cop.bbs.service.BlogVO;
import egovframework.com.cop.bbs.service.BoardMaster;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.EgovBBSMasterService;

/**
 * ????????? ? ????? ?????(JPA ? ??
 **/
@Service("EgovBBSMasterService")
@org.springframework.context.annotation.Lazy
public class EgovBBSMasterServiceImpl extends EgovAbstractServiceImpl implements EgovBBSMasterService {

	@Resource(name = "egovBoardMasterService")
	private EgovBoardMasterService boardMasterService;

	@Resource(name = "egovBlogIdGnrService")
	private EgovIdGnrService idgenServiceBlog;

	@Resource(name = "egovBBSMstrIdGnrService")
	private EgovIdGnrService idgenServiceBbs;

	@Override
	public Map<String, Object> selectNotUsedBdMstrList(BoardMasterVO boardMasterVO) {
		Page<BoardMasterDto> page = boardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),
				boardMasterVO.getSearchWrd(),
				PageRequest.of(boardMasterVO.getFirstIndex() / boardMasterVO.getRecordCountPerPage(),
						boardMasterVO.getRecordCountPerPage()));

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));
		return map;
	}

	@Override
	public void deleteBBSMasterInf(BoardMaster boardMaster) {
		boardMasterService.deleteBoardMaster(boardMaster.getBbsId(), boardMaster.getLastUpdusrId());
	}

	@Override
	public void updateBBSMasterInf(BoardMaster boardMaster) throws Exception {
		BoardMasterDto dto = toDto(boardMaster);
		boardMasterService.updateBoardMaster(dto);
	}

	@Override
	public BoardMasterVO selectBBSMasterInf(BoardMasterVO boardMasterVO) throws Exception {
		BoardMasterDto dto = boardMasterService.getBoardMaster(boardMasterVO.getBbsId());
		return toVO(dto);
	}

	@Override
	public Map<String, Object> selectBBSMasterInfs(BoardMasterVO boardMasterVO) {
		Page<BoardMasterDto> page = boardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),
				boardMasterVO.getSearchWrd(),
				PageRequest.of(boardMasterVO.getFirstIndex() / boardMasterVO.getRecordCountPerPage(),
						boardMasterVO.getRecordCountPerPage()));

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));
		return map;
	}

	@Override
	public Map<String, Object> selectBlogMasterInfs(BoardMasterVO boardMasterVO) {
		Page<BlogDto> page = boardMasterService.getBlogList(boardMasterVO.getSearchCnd(), boardMasterVO.getSearchWrd(),
				PageRequest.of(boardMasterVO.getFirstIndex() / boardMasterVO.getRecordCountPerPage(),
						boardMasterVO.getRecordCountPerPage()));

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toBlogVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));
		return map;
	}

	@Override
	public void insertBBSMasterInf(BoardMaster boardMaster) throws Exception {
		BoardMasterDto dto = toDto(boardMaster);
		boardMasterService.createBoardMaster(dto);
	}

	@Override
	public String checkBlogUser(BlogVO blogVO) {
		boolean exists = boardMasterService.checkBlogUser(blogVO.getFrstRegisterId());
		return exists ? "EXIST" : "";
	}

	@Override
	public BlogVO checkBlogUser2(BlogVO blogVO) {
		BlogDto dto = boardMasterService.getBlog(blogVO.getBlogId());
		return toBlogVO(dto);
	}

	@Override
	public void insertBoardBlogUserRqst(BlogUser blogUser) {
		boardMasterService.joinBlog(blogUser.getBlogId(), blogUser.getEmplyrId(), blogUser.getMngrAt());
	}

	@Override
	public void insertBlogMaster(Blog blog) throws FdlException {
		BlogDto dto = toBlogDto(blog);
		boardMasterService.createBlog(dto);
	}

	@Override
	public void insertBlogMasterAndBoardBlogUserRqst(Blog blog, LoginVO user) throws Exception {
		String blogId = idgenServiceBlog.getNextStringId();
		String bbsId = idgenServiceBbs.getNextStringId();

		blog.setBlogId(blogId);
		blog.setBbsId(bbsId);
		blog.setFrstRegisterId(user != null ? user.getUniqId() : "");
		blog.setBlogAt("Y");

		this.insertBlogMaster(blog);
		this.boardMasterService.joinBlog(blogId, user != null ? user.getUniqId() : "", "Y");
	}

	@Override
	public BlogVO selectBlogDetail(BlogVO blogVO) throws Exception {
		BlogDto dto = boardMasterService.getBlog(blogVO.getBlogId());
		return toBlogVO(dto);
	}

	@Override
	public List<BlogVO> selectBlogListPortlet(BlogVO blogVO) throws Exception {
		return boardMasterService.getBlogListPortlet().stream().map(this::toBlogVO).collect(Collectors.toList());
	}

	@Override
	public List<BoardMasterVO> selectBBSListPortlet(BoardMasterVO boardMasterVO) throws Exception {
		return boardMasterService.getBoardMasterListPortlet().stream().map(this::toVO).collect(Collectors.toList());
	}

	private BoardMasterVO toVO(BoardMasterDto dto) {
		if (dto == null)
			return null;
		BoardMasterVO vo = new BoardMasterVO();
		vo.setBbsId(dto.getBbsId());
		vo.setBbsNm(dto.getBbsNm());
		vo.setBbsIntrcn(dto.getBbsIntrcn());
		vo.setBbsTyCode(dto.getBbsTyCode());
		vo.setTmplatId(dto.getTmplatId());
		vo.setUseAt(dto.getUseAt());
		vo.setReplyPosblAt(dto.getReplyPosblAt());
		vo.setFileAtchPosblAt(dto.getFileAtchPosblAt());
		vo.setAtchPosblFileNumber(dto.getAtchPosblFileNumber());
		vo.setAtchPosblFileSize(dto.getAtchPosblFileSize() != null ? dto.getAtchPosblFileSize().toString() : "");
		vo.setCmmntyId(dto.getCmmntyId());
		vo.setBlogId(dto.getBlogId());
		vo.setCommentAt("Y".equals(dto.getCommentAt()) ? "comment" : "");
		vo.setStsfdgAt("Y".equals(dto.getStsfdgAt()) ? "stsfdg" : "");
		return vo;
	}

	private BoardMasterDto toDto(BoardMaster vo) {
		if (vo == null)
			return null;
		return BoardMasterDto.builder()
				.bbsId(vo.getBbsId())
				.bbsNm(vo.getBbsNm())
				.bbsIntrcn(vo.getBbsIntrcn())
				.bbsTyCode(vo.getBbsTyCode())
				.tmplatId(vo.getTmplatId())
				.useAt(vo.getUseAt())
				.replyPosblAt(vo.getReplyPosblAt())
				.fileAtchPosblAt(vo.getFileAtchPosblAt())
				.atchPosblFileNumber(vo.getAtchPosblFileNumber())
				.atchPosblFileSize(vo.getAtchPosblFileSize() != null && !vo.getAtchPosblFileSize().isEmpty()
						? Long.parseLong(vo.getAtchPosblFileSize())
						: 0L)
				.frstRegisterId(vo.getFrstRegisterId())
				.lastUpdusrId(vo.getLastUpdusrId())
				.cmmntyId(vo.getCmmntyId())
				.blogId(vo.getBlogId())
				.blogAt(vo.getBlogAt())
				.commentAt("comment".equals(vo.getOption()) ? "Y" : "N")
				.stsfdgAt("stsfdg".equals(vo.getOption()) ? "Y" : "N")
				.build();
	}

	private BlogVO toBlogVO(BlogDto dto) {
		if (dto == null)
			return null;
		BlogVO vo = new BlogVO();
		vo.setBlogId(dto.getBlogId());
		vo.setBbsId(dto.getBbsId());
		vo.setBlogNm(dto.getBlogNm());
		vo.setBlogIntrcn(dto.getBlogIntrcn());
		vo.setUseAt(dto.getUseAt());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		return vo;
	}

	private BlogDto toBlogDto(Blog vo) {
		if (vo == null)
			return null;
		return BlogDto.builder()
				.blogId(vo.getBlogId())
				.bbsId(vo.getBbsId())
				.blogNm(vo.getBlogNm())
				.blogIntrcn(vo.getBlogIntrcn())
				.registSeCode(vo.getRegistSeCode())
				.tmplatId(vo.getTmplatId())
				.useAt(vo.getUseAt())
				.frstRegisterId(vo.getFrstRegisterId())
				.blogAt(vo.getBlogAt())
				.build();
	}
}
