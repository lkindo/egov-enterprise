package egovframework.com.cop.bbs.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cmm.util.EgovXssChecker;
import egovframework.com.cop.bbs.service.BlogVO;
import egovframework.com.cop.bbs.service.Board;
import egovframework.com.cop.bbs.service.BoardMaster;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.EgovArticleService;
import egovframework.com.cop.bbs.service.EgovBBSMasterService;
import egovframework.com.cop.bbs.service.EgovBBSSatisfactionService;
import egovframework.com.cop.cmt.service.CommentVO;
import egovframework.com.cop.cmt.service.EgovArticleCommentService;
import egovframework.com.cop.tpl.service.EgovTemplateManageService;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * 寃뚯떆臾?愿由щ? ?꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.19  ?댁궪??         理쒖큹 ?앹꽦
 *   2009.06.29  ?쒖꽦怨?         2?④퀎 湲곕뒫 異붽? (?볤?愿由? 留뚯”?꾩“??
 *   2011.07.01  ?덈???         ?볤?, ?ㅽ겕?? 留뚯”??議곗궗 湲곕뒫??醫낆냽???쒓굅
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.09.07  ?쒖???         ?좏슚 寃뚯떆??寃뚯떆??吏?섎룄 寃뚯떆臾쇱씠 議고쉶?섎뜕 ?ㅻ쪟 ?섏젙
 *   2016.06.13  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2019.05.17  ?좎슜??         KISA 痍⑥빟??議곗튂 諛?蹂댁셿
 *   2020.10.27  ?좎슜??         ?뚯씪 ?낅줈???섏젙 (multiRequest.getFiles)
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2024.10.29  ?대갚??         寃뚯떆??寃?됱“嫄??좎?
 *   2024.10.29  inganyoyo     Transaction 泥섎━ ?ㅻ쪟 ?섏젙(Article)
 *   2025.06.03  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(留ㅺ컻蹂???ы븷??諛⑹?)
 *
 *      </pre>
 */

@Controller
public class EgovArticleController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovArticleController.class);

	@Resource(name = "EgovArticleService")
	private EgovArticleService egovArticleService;

	@Resource(name = "EgovBBSMasterService")
	private EgovBBSMasterService egovBBSMasterService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "EgovArticleCommentService")
	protected EgovArticleCommentService egovArticleCommentService;

	@Resource(name = "EgovBBSSatisfactionService")
	private EgovBBSSatisfactionService bbsSatisfactionService;

	@Resource(name = "EgovTemplateManageService")
	private EgovTemplateManageService egovTemplateManageService;

    //
                     Logger log = Logger.getLogger(this.getClass());

	/**
	 * XSS 諛⑹? 泥섎━.
	 * 
	 * @param data
	 * @return
	 */
	protected String unscript(String data) {
		if (data == null || data.trim().equals("")) {
			return "";
		}

		String ret = data;

		ret = ret.replaceAll("<(S|s)(C|c)(R|r)(I|i)(P|p)(T|t)", "&lt;script");
		ret = ret.replaceAll("</(S|s)(C|c)(R|r)(I|i)(P|p)(T|t)", "&lt;/script");

		ret = ret.replaceAll("<(O|o)(B|b)(J|j)(E|e)(C|c)(T|t)", "&lt;object");
		ret = ret.replaceAll("</(O|o)(B|b)(J|j)(E|e)(C|c)(T|t)", "&lt;/object");

		ret = ret.replaceAll("<(A|a)(P|p)(P|p)(L|l)(E|e)(T|t)", "&lt;applet");
		ret = ret.replaceAll("</(A|a)(P|p)(P|p)(L|l)(E|e)(T|t)", "&lt;/applet");

		ret = ret.replaceAll("<(E|e)(M|m)(B|b)(E|e)(D|d)", "&lt;embed");
		ret = ret.replaceAll("</(E|e)(M|m)(B|b)(E|e)(D|d)", "&lt;embed");

		ret = ret.replaceAll("<(F|f)(O|o)(R|r)(M|m)", "&lt;form");
		ret = ret.replaceAll("</(F|f)(O|o)(R|r)(M|m)", "&lt;form");

		return ret;
	}

	/**
	 * 寃뚯떆臾쇱뿉 ???紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectArticleList.do")
	public String selectArticleList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		BoardMasterVO vo = new BoardMasterVO();

		vo.setBbsId(boardVO.getBbsId());
		vo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		BoardMasterVO master = egovBBSMasterService.selectBBSMasterInf(vo);

		// 諛⑸챸濡앹? 諛⑸챸濡?寃뚯떆?먯쑝濡??대룞
		if (master.getBbsTyCode().equals("BBST03")) {
			return "forward:/cop/bbs/selectGuestArticleList.do";
		}

		boardVO.setPageUnit(propertyService.getInt("pageUnit"));
		boardVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
		paginationInfo.setPageSize(boardVO.getPageSize());

		boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
		boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleService.selectArticleList(boardVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		// 怨듭??ы빆 異붿텧
		List<BoardVO> noticeList = egovArticleService.selectNoticeArticleList(boardVO);

		paginationInfo.setTotalRecordCount(totCnt);

		// -------------------------------
		// 湲곕낯 BBS template 吏??
		// -------------------------------
		if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
			master.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}
		//// -----------------------------

		if (user != null) {
			model.addAttribute("sessionUniqId", user.getUniqId());
		}

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("articleVO", boardVO);
		model.addAttribute("boardMasterVO", master);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("noticeList", noticeList);
		return "egovframework/com/cop/bbs/EgovArticleList";
	}

	/**
	 * 寃뚯떆臾쇱뿉 ????곸꽭 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectArticleDetail.do")
	public String selectArticleDetail(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		boardVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		BoardVO vo = egovArticleService.selectArticleDetail(boardVO);

		model.addAttribute("result", vo);
		model.addAttribute("sessionUniqId", (user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		// 鍮꾨?湲? ?묒꽦?먮쭔 蹂쇱닔 ?덉쓬
		if (!EgovStringUtil.isEmpty(vo.getSecretAt()) && vo.getSecretAt().equals("Y")
				&& !((user == null || user.getUniqId() == null) ? "" : user.getUniqId())
						.equals(vo.getFrstRegisterId())) {
			return "forward:/cop/bbs/selectArticleList.do";
		}

		// ----------------------------
		// template 泥섎━ (湲곕낯 BBS template 吏???ы븿)
		// ----------------------------
		BoardMasterVO master = new BoardMasterVO();

		master.setBbsId(boardVO.getBbsId());
		master.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardMasterVO masterVo = egovBBSMasterService.selectBBSMasterInf(master);

		if (masterVo.getTmplatCours() == null || masterVo.getTmplatCours().equals("")) {
			masterVo.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}

		//// -----------------------------

		// ----------------------------
		// 2009.06.29 : 2?④퀎 湲곕뒫 異붽?
		// 2011.07.01 : ?볤?, 留뚯”??議곗궗 湲곕뒫??醫낆냽???쒓굅
		// ----------------------------
		if (egovArticleCommentService != null) {
			if (egovArticleCommentService.canUseComment(boardVO.getBbsId())) {
				model.addAttribute("useComment", "true");
			}
		}
		if (bbsSatisfactionService != null) {
			if (bbsSatisfactionService.canUseSatisfaction(boardVO.getBbsId())) {
				model.addAttribute("useSatisfaction", "true");
			}
		}
		//// --------------------------

		model.addAttribute("boardMasterVO", masterVo);

		return "egovframework/com/cop/bbs/EgovArticleDetail";
	}

	/**
	 * 寃뚯떆臾??깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param boardVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/insertArticleView.do")
	public String insertArticleView(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		BoardMasterVO bdMstr = new BoardMasterVO();

		if (isAuthenticated) {

			BoardMasterVO vo = new BoardMasterVO();
			vo.setBbsId(boardVO.getBbsId());
			vo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			bdMstr = egovBBSMasterService.selectBBSMasterInf(vo);
		}

		// ----------------------------
		// 湲곕낯 BBS template 吏??
		// ----------------------------
		if (bdMstr.getTmplatCours() == null || bdMstr.getTmplatCours().equals("")) {
			bdMstr.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}

		model.addAttribute("articleVO", boardVO);
		model.addAttribute("boardMasterVO", bdMstr);
		//// -----------------------------

		return "egovframework/com/cop/bbs/EgovArticleRegist";
	}

	/**
	 * 寃뚯떆臾쇱쓣 ?깅줉?쒕떎.
	 * 
	 * @param boardVO
	 * @param board
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/insertArticle.do")
	public String insertArticle(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
			@Valid @ModelAttribute("board") BoardVO board, BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {

			BoardMasterVO master = new BoardMasterVO();

			master.setBbsId(boardVO.getBbsId());
			master.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			master = egovBBSMasterService.selectBBSMasterInf(master);

			// ----------------------------
			// 湲곕낯 BBS template 吏??
			// ----------------------------
			if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
				master.setTmplatCours("css/egovframework/com/cop/tpl/egovBaseTemplate.css");
			}

			model.addAttribute("boardMasterVO", master);
			//// -----------------------------

			return "egovframework/com/cop/bbs/EgovArticleRegist";
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		board.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		board.setBbsId(boardVO.getBbsId());
		board.setBlogId(boardVO.getBlogId());

		// ?듬챸?깅줉 泥섎━
		if (board.getAnonymousAt() != null && board.getAnonymousAt().equals("Y")) {
			board.setNtcrId("anonymous"); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??ID ???
			board.setNtcrNm("?듬챸"); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??Name ???
			board.setFrstRegisterId("anonymous");

		} else {
			board.setNtcrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId()); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??ID
																									// ???
			board.setNtcrNm((user == null || user.getName() == null) ? "" : user.getName()); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??Name
																								// ???

		}

		board.setNttCn(unscript(board.getNttCn())); // XSS 諛⑹?
		egovArticleService.insertArticleAndFiles(board, files);

		if (boardVO.getBlogAt().equals("Y")) {
			return "forward:/cop/bbs/selectArticleBlogList.do";
		} else {
			model.addAttribute("bbsId", boardVO.getBbsId());
			model.addAttribute("searchCnd", boardVO.getSearchCnd());
			model.addAttribute("searchWrd", boardVO.getSearchWrd());
			model.addAttribute("pageIndex", boardVO.getPageIndex());
			return "redirect:/cop/bbs/selectArticleList.do";
		}

	}

	/**
	 * 寃뚯떆臾쇱뿉 ????듬? ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param boardVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/replyArticleView.do")
	public String addReplyBoardArticle(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		BoardMasterVO master = new BoardMasterVO();
		BoardVO articleVO = new BoardVO();
		master.setBbsId(boardVO.getBbsId());
		master.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		master = egovBBSMasterService.selectBBSMasterInf(master);
		BoardVO result = egovArticleService.selectArticleDetail(boardVO);

		// ----------------------------
		// 湲곕낯 BBS template 吏??
		// ----------------------------
		if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
			master.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}

		model.addAttribute("boardMasterVO", master);
		model.addAttribute("result", result);

		model.addAttribute("articleVO", articleVO);

		if (result.getBlogAt().equals("chkBlog")) {
			return "egovframework/com/cop/bbs/EgovArticleBlogReply";
		} else {
			return "egovframework/com/cop/bbs/EgovArticleReply";
		}
	}

	/**
	 * 寃뚯떆臾쇱뿉 ????듬????깅줉?쒕떎.
	 * 
	 * @param boardVO
	 * @param board
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/replyArticle.do")
	public String replyBoardArticle(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
			@Valid @ModelAttribute("board") BoardVO board, BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		BoardMasterVO master = new BoardMasterVO();

		master.setBbsId(boardVO.getBbsId());
		master.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		master = egovBBSMasterService.selectBBSMasterInf(master);

		// ----------------------------
		// 湲곕낯 BBS template 吏??
		// ----------------------------
		if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
			master.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}

		if (bindingResult.hasErrors()) {

			model.addAttribute("articleVO", boardVO);
			model.addAttribute("boardMasterVO", master);
			//// -----------------------------

			return "egovframework/com/cop/bbs/EgovArticleReply";
		}

		// ?몄쬆??沅뚰븳 紐⑸줉
		List<String> authList = EgovUserDetailsHelper.getAuthorities();
		// 愿由ъ옄 沅뚰븳 泥댄겕
		if (!authList.contains("ROLE_ADMIN")) {
			BoardVO vo = egovArticleService.selectArticleDetail(boardVO);
			if (vo == null || "Y".equals(vo.getSecretAt())) {

				model.addAttribute("articleVO", boardVO);
				model.addAttribute("boardMasterVO", master);

				model.addAttribute("resultMsg", "errors.auth.invalid");

				return "egovframework/com/cop/bbs/EgovArticleReply";
			}
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		board.setReplyAt("Y");
		board.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		board.setBbsId(board.getBbsId());
		board.setParnts(Long.toString(boardVO.getNttId()));
		board.setSortOrdr(boardVO.getSortOrdr());
		board.setReplyLc(Integer.toString(Integer.parseInt(boardVO.getReplyLc()) + 1));

		// ?듬챸?깅줉 泥섎━
		if (board.getAnonymousAt() != null && board.getAnonymousAt().equals("Y")) {
			board.setNtcrId("anonymous"); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??ID ???
			board.setNtcrNm("?듬챸"); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??Name ???
			board.setFrstRegisterId("anonymous");

		} else {
			board.setNtcrId((user == null || user.getId() == null) ? "" : user.getId()); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??ID ???
			board.setNtcrNm((user == null || user.getName() == null) ? "" : user.getName()); // 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪빐 ?깅줉??Name
																								// ???

		}
		board.setNttCn(unscript(board.getNttCn())); // XSS 諛⑹?

		egovArticleService.insertArticleAndFiles(board, files);

		return "forward:/cop/bbs/selectArticleList.do";
	}

	/**
	 * 寃뚯떆臾??섏젙???꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param boardVO
	 * @param vo
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/updateArticleView.do")
	public String updateArticleView(@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("board") BoardVO vo,
			ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		boardVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardMasterVO bmvo = new BoardMasterVO();
		BoardVO bdvo = new BoardVO();

		vo.setBbsId(boardVO.getBbsId());

		bmvo.setBbsId(boardVO.getBbsId());
		bmvo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		if (isAuthenticated) {
			bmvo = egovBBSMasterService.selectBBSMasterInf(bmvo);
			bdvo = egovArticleService.selectArticleDetail(boardVO);
		}

		// ----------------------------
		// 湲곕낯 BBS template 吏??
		// ----------------------------
		if (bmvo.getTmplatCours() == null || bmvo.getTmplatCours().equals("")) {
			bmvo.setTmplatCours("/css/egovframework/com/cop/tpl/egovBaseTemplate.css");
		}

		// ?듬챸 ?깅줉湲??寃쎌슦 ?섏젙 遺덇?
		if (bdvo.getNtcrId().equals("anonymous")) {
			model.addAttribute("result", bdvo);
			model.addAttribute("boardMasterVO", bmvo);
			return "egovframework/com/cop/bbs/EgovArticleDetail";
		}

		model.addAttribute("articleVO", bdvo);
		model.addAttribute("boardMasterVO", bmvo);

		if (boardVO.getBlogAt().equals("chkBlog")) {
			return "egovframework/com/cop/bbs/EgovArticleBlogUpdt";
		} else {
			return "egovframework/com/cop/bbs/EgovArticleUpdt";
		}

	}

	/**
	 * 寃뚯떆臾쇱뿉 ????댁슜???섏젙?쒕떎.
	 * 
	 * @param boardVO
	 * @param board
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/updateArticle.do")
	public String updateBoardArticle(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
			@Valid @ModelAttribute("board") Board board, BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// --------------------------------------------------------------------------------------------
		// @ XSS ???沅뚰븳泥댄겕 泥댄겕 START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");
		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		BoardVO vo = egovArticleService.selectArticleDetail(boardVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(multiRequest, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ???沅뚰븳泥댄겕 泥댄겕 END
		// --------------------------------------------------------------------------------------------

		String atchFileId = boardVO.getAtchFileId();

		if (bindingResult.hasErrors()) {

			boardVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			BoardMasterVO bmvo = new BoardMasterVO();
			BoardVO bdvo = new BoardVO();

			bmvo.setBbsId(boardVO.getBbsId());
			bmvo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			bmvo = egovBBSMasterService.selectBBSMasterInf(bmvo);
			bdvo = egovArticleService.selectArticleDetail(boardVO);

			model.addAttribute("articleVO", bdvo);
			model.addAttribute("boardMasterVO", bmvo);

			return "egovframework/com/cop/bbs/EgovArticleUpdt";
		}

		board.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		board.setNtcrNm(""); // dummy ?ㅻ쪟 ?섏젙 (?듬챸???꾨땶 寃쎌슦 validator 泥섎━瑜??꾪빐 dummy濡?吏?뺣맖)
		board.setPassword(""); // dummy ?ㅻ쪟 ?섏젙 (?듬챸???꾨땶 寃쎌슦 validator 泥섎━瑜??꾪빐 dummy濡?吏?뺣맖)

		board.setNttCn(unscript(board.getNttCn())); // XSS 諛⑹?

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		egovArticleService.updateArticleAndFiles(board, files, atchFileId);

		model.addAttribute("bbsId", boardVO.getBbsId());
		model.addAttribute("searchCnd", boardVO.getSearchCnd());
		model.addAttribute("searchWrd", boardVO.getSearchWrd());
		model.addAttribute("pageIndex", boardVO.getPageIndex());

		return "redirect:/cop/bbs/selectArticleList.do";
	}

	/**
	 * 寃뚯떆臾쇱뿉 ????댁슜????젣?쒕떎.
	 * 
	 * @param boardVO
	 * @param board
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/deleteArticle.do")
	public String deleteBoardArticle(HttpServletRequest request, @ModelAttribute("searchVO") BoardVO boardVO,
			@ModelAttribute("board") Board board, @ModelAttribute("bdMstr") BoardMaster bdMstr, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		// --------------------------------------------------------------------------------------------
		// @ XSS ???沅뚰븳泥댄겕 泥댄겕 START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");
		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		BoardVO vo = egovArticleService.selectArticleDetail(boardVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ???沅뚰븳泥댄겕 泥댄겕 END
		// --------------------------------------------------------------------------------------------

		BoardVO bdvo = egovArticleService.selectArticleDetail(boardVO);
		// ?듬챸 ?깅줉湲??寃쎌슦 ?섏젙 遺덇?
		if (bdvo.getNtcrId().equals("anonymous")) {
			model.addAttribute("result", bdvo);
			model.addAttribute("boardMasterVO", bdMstr);
			return "egovframework/com/cop/bbs/EgovArticleDetail";
		}

		if (isAuthenticated) {
			board.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			egovArticleService.deleteArticle(board);
		}

		if (boardVO.getBlogAt().equals("chkBlog")) {
			return "forward:/cop/bbs/selectArticleBlogList.do";
		} else {
			model.addAttribute("bbsId", boardVO.getBbsId());
			model.addAttribute("searchCnd", boardVO.getSearchCnd());
			model.addAttribute("searchWrd", boardVO.getSearchWrd());
			model.addAttribute("pageIndex", boardVO.getPageIndex());
			return "redirect:/cop/bbs/selectArticleList.do";
		}
	}

	/**
	 * 諛⑸챸濡앹뿉 ???紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectGuestArticleList.do")
	public String selectGuestArticleList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?섏젙 諛???젣 湲곕뒫 ?쒖뼱瑜??꾪븳 泥섎━
		model.addAttribute("sessionUniqId", (user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardVO vo = new BoardVO();

		vo.setBbsId(boardVO.getBbsId());
		vo.setBbsNm(boardVO.getBbsNm());
		vo.setNtcrNm((user == null || user.getName() == null) ? "" : user.getName());
		vo.setNtcrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardMasterVO masterVo = new BoardMasterVO();

		masterVo.setBbsId(vo.getBbsId());
		masterVo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardMasterVO mstrVO = egovBBSMasterService.selectBBSMasterInf(masterVo);

		vo.setPageIndex(boardVO.getPageIndex());
		vo.setPageUnit(propertyService.getInt("pageUnit"));
		vo.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(vo.getPageIndex());
		paginationInfo.setRecordCountPerPage(vo.getPageUnit());
		paginationInfo.setPageSize(vo.getPageSize());

		vo.setFirstIndex(paginationInfo.getFirstRecordIndex());
		vo.setLastIndex(paginationInfo.getLastRecordIndex());
		vo.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleService.selectGuestArticleList(vo);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("user", user);
		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("boardMasterVO", mstrVO);
		model.addAttribute("articleVO", vo);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/bbs/EgovGuestArticleList";
	}

	/**
	 * 諛⑸챸濡앹뿉 ????댁슜???깅줉?쒕떎.
	 * 
	 * @param boardVO
	 * @param board
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/insertGuestArticle.do")
	public String insertGuestList(@ModelAttribute("searchVO") BoardVO boardVO, @Valid @ModelAttribute("Board") Board board,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {

			BoardVO vo = new BoardVO();

			vo.setBbsId(boardVO.getBbsId());
			vo.setBbsNm(boardVO.getBbsNm());
			vo.setNtcrNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
			vo.setNtcrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			BoardMasterVO masterVo = new BoardMasterVO();

			masterVo.setBbsId(vo.getBbsId());
			masterVo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			BoardMasterVO mstrVO = egovBBSMasterService.selectBBSMasterInf(masterVo);

			vo.setPageUnit(propertyService.getInt("pageUnit"));
			vo.setPageSize(propertyService.getInt("pageSize"));

			PaginationInfo paginationInfo = new PaginationInfo();
			paginationInfo.setCurrentPageNo(vo.getPageIndex());
			paginationInfo.setRecordCountPerPage(vo.getPageUnit());
			paginationInfo.setPageSize(vo.getPageSize());

			vo.setFirstIndex(paginationInfo.getFirstRecordIndex());
			vo.setLastIndex(paginationInfo.getLastRecordIndex());
			vo.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

			Map<String, Object> map = egovArticleService.selectGuestArticleList(vo);
			int totCnt = Integer.parseInt((String) map.get("resultCnt"));

			paginationInfo.setTotalRecordCount(totCnt);

			model.addAttribute("resultList", map.get("resultList"));
			model.addAttribute("resultCnt", map.get("resultCnt"));
			model.addAttribute("boardMasterVO", mstrVO);
			model.addAttribute("articleVO", vo);
			model.addAttribute("paginationInfo", paginationInfo);

			return "egovframework/com/cop/bbs/EgovGuestArticleList";

		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		board.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		egovArticleService.insertArticleAndFiles(board, null);

		boardVO.setNttCn("");
		boardVO.setPassword("");
		boardVO.setNtcrId("");
		boardVO.setNttId(0);

		return "forward:/cop/bbs/selectGuestArticleList.do";
	}

	/**
	 * 諛⑸챸濡앹뿉 ????댁슜????젣?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/deleteGuestArticle.do")
	public String deleteGuestList(@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("articleVO") Board board,
			ModelMap model) throws Exception {
		@SuppressWarnings("unused")
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			egovArticleService.deleteArticle(boardVO);
		}

		return "forward:/cop/bbs/selectGuestArticleList.do";
	}

	/**
	 * 諛⑸챸濡??섏젙???꾪븳 ?뱀젙 ?댁슜??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/updateGuestArticleView.do")
	public String updateGuestArticleView(@ModelAttribute("searchVO") BoardVO boardVO,
			@ModelAttribute("boardMasterVO") BoardMasterVO brdMstrVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?섏젙 諛???젣 湲곕뒫 ?쒖뼱瑜??꾪븳 泥섎━
		model.addAttribute("sessionUniqId", (user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		BoardVO vo = egovArticleService.selectArticleDetail(boardVO);

		boardVO.setBbsId(boardVO.getBbsId());
		boardVO.setBbsNm(boardVO.getBbsNm());
		boardVO.setNtcrNm((user == null || user.getName() == null) ? "" : user.getName());

		boardVO.setPageUnit(propertyService.getInt("pageUnit"));
		boardVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
		paginationInfo.setPageSize(boardVO.getPageSize());

		boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
		boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleService.selectGuestArticleList(boardVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("articleVO", vo);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/bbs/EgovGuestArticleList";
	}

	/**
	 * 諛⑸챸濡앹쓣 ?섏젙?섍퀬 寃뚯떆??硫붿씤?섏씠吏瑜?議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/updateGuestArticle.do")
	public String updateGuestArticle(@ModelAttribute("searchVO") BoardVO boardVO, @Valid @ModelAttribute Board board,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// BBST02, BBST04
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) { // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {

			BoardVO vo = new BoardVO();

			vo.setBbsId(boardVO.getBbsId());
			vo.setBbsNm(boardVO.getBbsNm());
			vo.setNtcrNm((user == null || user.getName() == null) ? "" : user.getName());
			vo.setNtcrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			BoardMasterVO masterVo = new BoardMasterVO();

			masterVo.setBbsId(vo.getBbsId());
			masterVo.setUniqId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			BoardMasterVO mstrVO = egovBBSMasterService.selectBBSMasterInf(masterVo);

			vo.setPageUnit(propertyService.getInt("pageUnit"));
			vo.setPageSize(propertyService.getInt("pageSize"));

			PaginationInfo paginationInfo = new PaginationInfo();
			paginationInfo.setCurrentPageNo(vo.getPageIndex());
			paginationInfo.setRecordCountPerPage(vo.getPageUnit());
			paginationInfo.setPageSize(vo.getPageSize());

			vo.setFirstIndex(paginationInfo.getFirstRecordIndex());
			vo.setLastIndex(paginationInfo.getLastRecordIndex());
			vo.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

			Map<String, Object> map = egovArticleService.selectGuestArticleList(vo);
			int totCnt = Integer.parseInt((String) map.get("resultCnt"));

			paginationInfo.setTotalRecordCount(totCnt);

			model.addAttribute("resultList", map.get("resultList"));
			model.addAttribute("resultCnt", map.get("resultCnt"));
			model.addAttribute("boardMasterVO", mstrVO);
			model.addAttribute("articleVO", vo);
			model.addAttribute("paginationInfo", paginationInfo);

			return "egovframework/com/cop/bbs/EgovGuestArticleList";
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		egovArticleService.updateArticle(board);
		boardVO.setNttCn("");
		boardVO.setPassword("");
		boardVO.setNtcrId("");
		boardVO.setNttId(0);

		return "forward:/cop/bbs/selectGuestArticleList.do";
	}

	/*********************
	 * 釉붾줈洹멸???
	 ********************/

	/**
	 * 釉붾줈洹?寃뚯떆?먯뿉 ???紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectArticleBlogList.do")
	public String selectArticleBlogList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		BlogVO blogVo = new BlogVO();
		blogVo.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		blogVo.setBbsId(boardVO.getBbsId());
		blogVo.setBlogId(boardVO.getBlogId());
		BlogVO master = egovBBSMasterService.selectBlogDetail(blogVo);

		boardVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		// 釉붾줈洹?移댄뀒怨좊━愿由?沅뚰븳(濡쒓렇?????ъ슜?먮쭔 媛??
		int loginUserCnt = egovArticleService.selectLoginUser(boardVO);

		// 釉붾줈洹?寃뚯떆???쒕ぉ 異붿텧
		List<BoardVO> blogNameList = egovArticleService.selectBlogNmList(boardVO);

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		model.addAttribute("sessionUniqId", (user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		model.addAttribute("articleVO", boardVO);
		model.addAttribute("boardMasterVO", master);
		model.addAttribute("blogNameList", blogNameList);
		model.addAttribute("loginUserCnt", loginUserCnt);

		return "egovframework/com/cop/bbs/EgovArticleBlogList";
	}

	/**
	 * 釉붾줈洹?寃뚯떆臾쇱뿉 ????곸꽭 ??댄???議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectArticleBlogDetail.do")
	public ModelAndView selectArticleBlogDetail(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			throw new IllegalAccessException("Login Required!");
		}

		BoardVO vo = new BoardVO();

		boardVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		boardVO.setPageUnit(propertyService.getInt("pageUnit"));
		boardVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
		paginationInfo.setPageSize(boardVO.getPageSize());

		boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
		boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BoardVO> blogSubJectList = egovArticleService.selectArticleDetailDefault(boardVO);
		vo = egovArticleService.selectArticleCnOne(boardVO);

		int totCnt = egovArticleService.selectArticleDetailDefaultCnt(boardVO);
		paginationInfo.setTotalRecordCount(totCnt);

		ModelAndView mav = new ModelAndView("jsonView");
		mav.addObject("blogSubJectList", blogSubJectList);
		mav.addObject("paginationInfo", paginationInfo);

		if (vo.getNttCn() != null) {
			mav.addObject("blogCnOne", vo);
		}

		// 鍮꾨?湲? ?묒꽦?먮쭔 蹂쇱닔 ?덉쓬
		if (!EgovStringUtil.isEmpty(vo.getSecretAt()) && vo.getSecretAt().equals("Y")
				&& !((user == null || user.getUniqId() == null) ? "" : user.getUniqId())
						.equals(vo.getFrstRegisterId())) {
			mav.setViewName("forward:/cop/bbs/selectArticleList.do");
		}
		return mav;
	}

	/**
	 * 釉붾줈洹?寃뚯떆臾쇱뿉 ????곸꽭 ?댁슜??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectArticleBlogDetailCn.do")
	public ModelAndView selectArticleBlogDetailCn(@ModelAttribute("searchVO") BoardVO boardVO,
			@ModelAttribute("commentVO") CommentVO commentVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		boardVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			throw new IllegalAccessException("Login Required!");
		}

		BoardVO vo = egovArticleService.selectArticleDetail(boardVO);

		// ----------------------------
		// ?볤? 泥섎━
		// ----------------------------
		CommentVO articleCommentVO = new CommentVO();
		commentVO.setWrterNm((user == null || user.getName() == null) ? "" : user.getName());

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(commentVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(commentVO.getSubPageUnit());
		paginationInfo.setPageSize(commentVO.getSubPageSize());

		commentVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		commentVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		commentVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleCommentService.selectArticleCommentList(commentVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		// ?볤? 泥섎━ END
		// ----------------------------

		List<BoardVO> blogCnList = egovArticleService.selectArticleDetailCn(boardVO);
		ModelAndView mav = new ModelAndView("jsonView");

		// ?섏젙 泥섎━?????볤? ?깅줉 ?붾㈃?쇰줈 泥섎━?섍린 ?꾪븳 援ы쁽
		if (commentVO.isModified()) {
			commentVO.setCommentNo("");
			commentVO.setCommentCn("");
		}

		// ?섏젙???꾪븳 泥섎━
		if (!commentVO.getCommentNo().equals("")) {
			mav.setViewName("forward:/cop/cmt/updateArticleCommentView.do");
		}

		mav.addObject("blogCnList", blogCnList);
		mav.addObject("resultUnder", vo);
		mav.addObject("paginationInfo", paginationInfo);
		mav.addObject("resultList", map.get("resultList"));
		mav.addObject("resultCnt", map.get("resultCnt"));
		mav.addObject("articleCommentVO", articleCommentVO); // validator ?⑸룄

		commentVO.setCommentCn(""); // ?깅줉 ???볤? ?댁슜 泥섎━

		// 鍮꾨?湲? ?묒꽦?먮쭔 蹂쇱닔 ?덉쓬
		if (!EgovStringUtil.isEmpty(vo.getSecretAt()) && vo.getSecretAt().equals("Y")
				&& !((user == null || user.getUniqId() == null) ? "" : user.getUniqId())
						.equals(vo.getFrstRegisterId())) {
			mav.setViewName("forward:/cop/bbs/selectArticleList.do");
		}
		return mav;

	}

	/**
	 * 媛쒖씤釉붾줈洹?愿由?
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/selectBlogListManager.do")
	public String selectBlogMasterList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		boardVO.setPageUnit(propertyService.getInt("pageUnit"));
		boardVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
		paginationInfo.setPageSize(boardVO.getPageSize());

		boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
		boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
		boardVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		Map<String, Object> map = egovArticleService.selectBlogListManager(boardVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/bbs/EgovBlogListManager";
	}

	/**
	 * ?쒗뵆由우뿉 ???誘몃━蹂닿린??寃뚯떆臾?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param boardVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/previewBoardList.do")
	public String previewBoardArticles(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String template = boardVO.getSearchWrd(); // ?쒗뵆由?URL

		BoardMasterVO master = new BoardMasterVO();

		master.setBbsNm("誘몃━蹂닿린 寃뚯떆??);

		boardVO.setPageUnit(propertyService.getInt("pageUnit"));
		boardVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
		paginationInfo.setPageSize(boardVO.getPageSize());

		boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
		boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		BoardVO target = null;
		List<BoardVO> list = new ArrayList<>();

		target = new BoardVO();
		target.setNttSj("寃뚯떆??湲곕뒫 ?ㅻ챸");
		target.setFrstRegisterId("ID");
		target.setFrstRegisterNm("愿由ъ옄");
		target.setFrstRegisterPnttm("2019-01-01");
		target.setInqireCo(7);
		target.setParnts("0");
		target.setReplyAt("N");
		target.setReplyLc("0");
		target.setUseAt("Y");

		list.add(target);

		target = new BoardVO();
		target.setNttSj("寃뚯떆??遺媛 湲곕뒫 ?ㅻ챸");
		target.setFrstRegisterId("ID");
		target.setFrstRegisterNm("愿由ъ옄");
		target.setFrstRegisterPnttm("2019-01-01");
		target.setInqireCo(7);
		target.setParnts("0");
		target.setReplyAt("N");
		target.setReplyLc("0");
		target.setUseAt("Y");

		list.add(target);

		boardVO.setSearchWrd("");

		int totCnt = list.size();

		// 怨듭??ы빆 異붿텧
		List<BoardVO> noticeList = egovArticleService.selectNoticeArticleList(boardVO);

		paginationInfo.setTotalRecordCount(totCnt);

		master.setTmplatCours(template);

		model.addAttribute("resultList", list);
		model.addAttribute("resultCnt", Integer.toString(totCnt));
		model.addAttribute("articleVO", boardVO);
		model.addAttribute("boardMasterVO", master);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("noticeList", noticeList);

		model.addAttribute("preview", "true");

		return "egovframework/com/cop/bbs/EgovArticleList";
	}

	/**
	 * 誘몃━蹂닿린 而ㅻ??덊떚 硫붿씤?섏씠吏瑜?議고쉶?쒕떎.
	 * 
	 * @param cmmntyVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/bbs/previewBlogMainPage.do")
	public String previewBlogMainPage(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			throw new IllegalAccessException("Login Required!");
		}

		String tmplatCours = boardVO.getSearchWrd();

		BlogVO master = new BlogVO();
		master.setBlogNm("誘몃━蹂닿린 釉붾줈洹?);
		master.setBlogIntrcn("誘몃━蹂닿린瑜??꾪븳 釉붾줈洹몄엯?덈떎.");
		master.setUseAt("Y");
		master.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		boardVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		// 釉붾줈洹?移댄뀒怨좊━愿由?沅뚰븳(濡쒓렇?????ъ슜?먮쭔 媛??
		int loginUserCnt = egovArticleService.selectLoginUser(boardVO);

		// 釉붾줈洹?寃뚯떆???쒕ぉ 異붿텧
		List<BoardVO> blogNameList = new ArrayList<>();

		BoardVO target = null;
		target = new BoardVO();
		target.setBbsNm("釉붾줈洹멸쾶?쒗뙋#1");

		blogNameList.add(target);

		if (user != null) {
			model.addAttribute("sessionUniqId", user.getUniqId());
		}

		model.addAttribute("articleVO", boardVO);
		model.addAttribute("boardMasterVO", master);
		model.addAttribute("blogNameList", blogNameList);
		model.addAttribute("loginUserCnt", loginUserCnt);

		model.addAttribute("preview", "true");

		// ?덉쟾??寃쎈줈 臾몄옄?대줈 議곗튂
		tmplatCours = EgovWebUtil.filePathBlackList(tmplatCours);

		// ?붿씠??由ъ뒪??泥댄겕
		List<TemplateInfVO> templateWhiteList = egovTemplateManageService.selectTemplateWhiteList();
		LOGGER.debug("Template > WhiteList Count = {}", templateWhiteList.size());
		if (tmplatCours == null) {
			tmplatCours = "";
		}
		for (TemplateInfVO templateInfVO : templateWhiteList) {
			LOGGER.debug("Template > whiteList TmplatCours = " + templateInfVO.getTmplatCours());
			if (tmplatCours.equals(templateInfVO.getTmplatCours())) {
				return tmplatCours;
			}
		}

		LOGGER.debug("Template > WhiteList mismatch! Please check Admin page!");
		return "egovframework/com/cmm/egovError";
	}

}
