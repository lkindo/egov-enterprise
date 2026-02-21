package egovframework.com.cop.bbs.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;

import egovframework.com.cop.bbs.service.Board;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.EgovArticleService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;

/**
 * ????? ? ServiceImpl ?????
 * JPA ??BoardService????? ???
 **/
@Slf4j
@Service("EgovArticleService")
public class EgovArticleServiceImpl extends EgovAbstractServiceImpl implements EgovArticleService {

	@Resource(name = "egovBoardService")
	private BoardService boardService;

	@Override
	public Map<String, Object> selectArticleList(BoardVO boardVO) {
		Pageable pageable = PageRequest.of(boardVO.getPageIndex() - 1, boardVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "nttId"));

		Page<BoardDto> page = boardService.getBoardPosts(boardVO.getBbsId(), boardVO.getSearchCnd(),
				boardVO.getSearchWrd(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	@Override
	public BoardVO selectArticleDetail(BoardVO boardVO) {
		BoardDto dto = boardService.getPostDetail(boardVO.getBbsId(), boardVO.getNttId());
		return toVO(dto);
	}

	@Override
	public BoardVO selectArticleCnOne(BoardVO boardVO) {
		// BoardService??? ??? ???? ??
		return selectArticleDetail(boardVO);
	}

	@SuppressWarnings("unchecked")
	@Override
	public List<BoardVO> selectArticleDetailDefault(BoardVO boardVO) {
		// ????????? ? ????????? ?????? ????? ???????
		// ??DAO??selectArticleDetailDefault ?? ??????
		// ???BoardService???? ???????????? ?? selectArticleList ?? ??
		return (List<BoardVO>) selectArticleList(boardVO).get("resultList");
	}

	@Override
	public int selectArticleDetailDefaultCnt(BoardVO boardVO) {
		return Integer.parseInt((String) selectArticleList(boardVO).get("resultCnt"));
	}

	@SuppressWarnings("unchecked")
	@Override
	public List<BoardVO> selectArticleDetailCn(BoardVO boardVO) {
		return (List<BoardVO>) selectArticleList(boardVO).get("resultList");
	}

	@Override
	public void insertArticleAndFiles(Board board, List<MultipartFile> files) throws Exception {
		BoardSaveRequest request = new BoardSaveRequest(
				board.getBbsId(), board.getNttSj(), board.getNttCn(),
				board.getNtceBgnde(), board.getNtceEndde(), board.getAtchFileId());

		if ("Y".equals(board.getReplyAt())) {
			boardService.replyPostWithFiles(board.getNtcrId(), Long.parseLong(board.getParnts()), request, files);
		} else {
			boardService.createPostWithFiles(board.getNtcrId(), request, files);
		}
	}

	@Override
	public void updateArticle(Board board) {
		BoardSaveRequest request = new BoardSaveRequest(
				board.getBbsId(), board.getNttSj(), board.getNttCn(),
				board.getNtceBgnde(), board.getNtceEndde(), board.getAtchFileId());
		boardService.updatePost(board.getBbsId(), board.getNttId(), request);
	}

	@Override
	public void updateArticleAndFiles(Board board, List<MultipartFile> files, String atchFileId) throws Exception {
		BoardSaveRequest request = new BoardSaveRequest(
				board.getBbsId(), board.getNttSj(), board.getNttCn(),
				board.getNtceBgnde(), board.getNtceEndde(), atchFileId);
		boardService.updatePostWithFiles(board.getBbsId(), board.getNttId(), request, files);
	}

	@Override
	public void deleteArticle(Board board) throws Exception {
		boardService.deletePost(board.getBbsId(), board.getNttId(), board.getLastUpdusrId());
	}

	@SuppressWarnings("unchecked")
	@Override
	public List<BoardVO> selectNoticeArticleList(BoardVO boardVO) {
		// ????????(? BoardService?? ?? ??????????????? ??????
		return (List<BoardVO>) selectArticleList(boardVO).get("resultList");
	}

	@Override
	public List<BoardVO> selectBlogNmList(BoardVO boardVO) {
		// ??????? BoardService?? ?? ? ?. ?? ???????
		return List.of();
	}

	@Override
	public Map<String, Object> selectGuestArticleList(BoardVO vo) {
		return selectArticleList(vo);
	}

	@Override
	public int selectLoginUser(BoardVO boardVO) {
		// ?????????? ?????? ?? ??? ??? ????.
		// ?? ???? ??frstRegisterId?? blogId???????
		BoardDto dto = boardService.getPostDetail(boardVO.getBbsId(), boardVO.getNttId());
		if (dto != null && dto.getFrstRegisterId() != null
				&& dto.getFrstRegisterId().equals(boardVO.getFrstRegisterId())) {
			return 1;
		}
		return 0;
	}

	@Override
	public Map<String, Object> selectBlogListManager(BoardVO vo) {
		// ???? ???? ?? selectArticleList????
		return selectArticleList(vo);
	}

	private BoardVO toVO(BoardDto dto) {
		if (dto == null)
			return null;
		BoardVO vo = new BoardVO();
		vo.setNttId(dto.getId());
		vo.setBbsId(dto.getBbsId());
		vo.setNttSj(dto.getNttSj());
		vo.setNttCn(dto.getNttCn());
		vo.setNtcrNm(dto.getNtcrNm());
		vo.setInqireCo(dto.getInqireCo());
		if (dto.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttmStr());
		}
		vo.setAtchFileId(dto.getAtchFileId());
		vo.setParnts(dto.getParnts());
		vo.setReplyAt(dto.getReplyAt());
		vo.setReplyLc(dto.getReplyLc() != null ? String.valueOf(dto.getReplyLc()) : "0");
		vo.setNtceBgnde(dto.getNtceBgnde());
		vo.setNtceEndde(dto.getNtceEndde());
		vo.setUseAt(dto.getUseAt());
		vo.setNtcrId(dto.getNtcrId());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		vo.setSecretAt(dto.getSecretAt());
		vo.setBbsNm(dto.getBbsNm());
		vo.setFrstRegisterNm(dto.getNtcrNm());
		return vo;
	}

}
