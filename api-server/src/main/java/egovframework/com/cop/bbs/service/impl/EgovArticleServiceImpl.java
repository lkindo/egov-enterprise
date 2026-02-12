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
 * 게시물 관리를 위한 ServiceImpl 클래스
 * JPA 기반의 BoardService를 위임하여 처리함.
 */
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
		// BoardService에 상세 조회와 동일하게 처리
		return selectArticleDetail(boardVO);
	}

	@SuppressWarnings("unchecked")
	@Override
	public List<BoardVO> selectArticleDetailDefault(BoardVO boardVO) {
		// 레거시 페이징 없이 상세 목록을 가져오는 경우이나, 여기선 단일 상세로 대체하거나 빈 리스트 처리
		// 기존 DAO는 selectArticleDetailDefault 라는 쿼리를 호출함.
		// 필요시 BoardService에 추가 구현이 필요할 수 있으나, 일단 selectArticleList 기반으로 처리
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
		// 공지사항 목록 조회 (현재 BoardService에는 명시적인 공지사항 조회 기능이 없으므로 일반 목록 조회로 대체)
		return (List<BoardVO>) selectArticleList(boardVO).get("resultList");
	}

	@Override
	public List<BoardVO> selectBlogNmList(BoardVO boardVO) {
		// 블로그 관련 로직은 BoardService에서 추가 구현 필요. 일단 빈 리스트 반환
		return List.of();
	}

	@Override
	public Map<String, Object> selectGuestArticleList(BoardVO vo) {
		return selectArticleList(vo);
	}

	@Override
	public int selectLoginUser(BoardVO boardVO) {
		// 로그인 사용자 체크 로직. 레거시에서는 게시글 작성자인지 확인하는 용도로 쓰임.
		// 원본 쿼리 확인 결과 frstRegisterId와 blogId를 사용함.
		BoardDto dto = boardService.getPostDetail(boardVO.getBbsId(), boardVO.getNttId());
		if (dto != null && dto.getFrstRegisterId() != null
				&& dto.getFrstRegisterId().equals(boardVO.getFrstRegisterId())) {
			return 1;
		}
		return 0;
	}

	@Override
	public Map<String, Object> selectBlogListManager(BoardVO vo) {
		// 블로그 관리자 목록 조회 로직. 일단 selectArticleList로 대체
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
