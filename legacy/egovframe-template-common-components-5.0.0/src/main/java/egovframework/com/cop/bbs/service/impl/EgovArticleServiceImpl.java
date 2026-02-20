package egovframework.com.cop.bbs.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cop.bbs.service.Board;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.EgovArticleService;
import jakarta.annotation.Resource;

/**
 * 寃뚯떆臾?愿由щ? ?꾪븳 ServiceImpl ?대옒??
 * 
 * <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2024.10.29  inganyoyo     Transaction 泥섎━ ?ㅻ쪟 ?섏젙(Article)
 *   2025.06.03  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(留ㅺ컻蹂???ы븷??諛⑹?), LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 * </pre>
 */

@Service("EgovArticleService")
public class EgovArticleServiceImpl extends EgovAbstractServiceImpl implements EgovArticleService {

	@Resource(name = "EgovArticleDAO")
	private EgovArticleDAO egovArticleDao;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovNttIdGnrService")
	private EgovIdGnrService nttIdgenService;
	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Override
	public Map<String, Object> selectArticleList(BoardVO boardVO) {
		List<BoardVO> list = egovArticleDao.selectArticleList(boardVO);

		int cnt = egovArticleDao.selectArticleListCnt(boardVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", list);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	@Override
	public BoardVO selectArticleDetail(BoardVO boardVO) {
		int iniqireCo = egovArticleDao.selectMaxInqireCo(boardVO);

		boardVO.setInqireCo(iniqireCo);
		egovArticleDao.updateInqireCo(boardVO);

		return egovArticleDao.selectArticleDetail(boardVO);
	}

	@Override
	public BoardVO selectArticleCnOne(BoardVO boardVO) {
		return egovArticleDao.selectArticleCnOne(boardVO);
	}

	@Override
	public List<BoardVO> selectArticleDetailDefault(BoardVO boardVO) {
		return egovArticleDao.selectArticleDetailDefault(boardVO);
	}

	@Override
	public int selectArticleDetailDefaultCnt(BoardVO boardVO) {
		return egovArticleDao.selectArticleDetailDefaultCnt(boardVO);
	}

	@Override
	public List<BoardVO> selectArticleDetailCn(BoardVO boardVO) {
		return egovArticleDao.selectArticleDetailCn(boardVO);
	}

	@Override
	public void insertArticleAndFiles(Board board, List<MultipartFile> files) throws Exception {
		List<FileVO> result = null;
		String atchFileId = "";

		if (files != null && !files.isEmpty()) {
			result = fileUtil.parseFileInf(files, "BBS_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(result);
		}
		board.setAtchFileId(atchFileId);

		if ("Y".equals(board.getReplyAt())) {
			// ?듦???寃쎌슦 1. Parnts瑜??명똿, 2.Parnts??sortOrdr???꾩옱湲??sortOrdr濡?媛?몄삤?꾨줉, 3.nttNo???꾩옱
			// 寃뚯떆?먯쓽 ?쒖꽌?濡?
			// replyLc??遺紐④???ReplyLc + 1

			board.setNttId(nttIdgenService.getNextIntegerId()); // ?듦??????nttId ?앹꽦
			egovArticleDao.replyArticle(board);

		} else {
			// ?듦????꾨땶寃쎌슦 Parnts = 0, replyLc??= 0, sortOrdr = nttNo(Query?먯꽌 泥섎━)
			board.setParnts("0");
			board.setReplyLc("0");
			board.setReplyAt("N");
			board.setNttId(nttIdgenService.getNextIntegerId());// 2011.09.22

			egovArticleDao.insertArticle(board);
		}
	}

	@Override
	public void updateArticle(Board board) {
		egovArticleDao.updateArticle(board);
	}

	@Override
	public void updateArticleAndFiles(Board board, List<MultipartFile> files, String atchFileId) throws Exception {
		if (!files.isEmpty()) {
			if (atchFileId == null || "".equals(atchFileId)) {
				List<FileVO> result = fileUtil.parseFileInf(files, "BBS_", 0, atchFileId, "");
				board.setAtchFileId(fileMngService.insertFileInfs(result));
			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int cnt = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "BBS_", cnt, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}

		this.updateArticle(board);
	}

	@Override
	public void deleteArticle(Board board) throws Exception {
		FileVO fvo = new FileVO();

		fvo.setAtchFileId(board.getAtchFileId());

		board.setNttSj("??湲? ?묒꽦?먯뿉 ?섑빐????젣?섏뿀?듬땲??");

		egovArticleDao.deleteArticle(board);

		if (!"".equals(fvo.getAtchFileId()) || fvo.getAtchFileId() != null) {
			fileService.deleteAllFileInf(fvo);
		}

	}

	@Override
	public List<BoardVO> selectNoticeArticleList(BoardVO boardVO) {
		return egovArticleDao.selectNoticeArticleList(boardVO);
	}

	@Override
	public List<BoardVO> selectBlogNmList(BoardVO boardVO) {
		return egovArticleDao.selectBlogNmList(boardVO);
	}

	@Override
	public Map<String, Object> selectGuestArticleList(BoardVO vo) {
		List<BoardVO> list = egovArticleDao.selectGuestArticleList(vo);

		int cnt = egovArticleDao.selectGuestArticleListCnt(vo);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", list);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	@Override
	public int selectLoginUser(BoardVO boardVO) {
		return egovArticleDao.selectLoginUser(boardVO);
	}

	@Override
	public Map<String, Object> selectBlogListManager(BoardVO vo) {
		List<BoardMasterVO> result = egovArticleDao.selectBlogListManager(vo);
		int cnt = egovArticleDao.selectBlogListManagerCnt(vo);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

}
