package egovframework.com.uss.olh.qna.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cmm.util.EgovXssChecker;
import egovframework.com.uss.olh.qna.service.EgovQnaService;
import egovframework.com.uss.olh.qna.service.QnaDefaultVO;
import egovframework.com.uss.olh.qna.service.QnaVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 *
 * Q&A瑜?泥섎━?섎뒗 Controller ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??    	?섏젙??          			?섏젙?댁슜
*  ------------   --------    ---------------------------------------------

 *
 *      </pre>
 */
/**
 * ?ъ슜??怨꾩젙??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * <p>
 * <b>NOTE:</b> Exception 醫낅쪟瑜?EgovBizException, RuntimeException ?먯꽌留??숈옉?쒕떎.
 * fail.common.msg 硫붿꽭吏?ㅺ? Message Resource ???뺤쓽 ?섏뼱 ?덉뼱???쒕떎.
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?띻만??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.10.21  ?닿린??         ??젣??鍮꾨?踰덊샇 ?뺤씤 異붽?(理쒖쥌媛먮━ 諛섏쁺)
 *   2016.08.05  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2025.08.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.08.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessarySemicolon(?꾩슂?녿뒗 ; 臾몄옣 議댁옱)
 *   2025.08.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovQnaController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQnaController.class);

	@Resource(name = "EgovQnaService")
	private EgovQnaService egovQnaService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * Q&A?뺣낫 紐⑸줉??議고쉶?쒕떎. (pageing)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "Q&A愿由?, order = 550, gid = 50)
	@RequestMapping(value = "/uss/olh/qna/selectQnaList.do")
	public String selectQnaList(@ModelAttribute("searchVO") QnaVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.SiteList */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<QnaVO> resultList = egovQnaService.selectQnaList(searchVO);
		model.addAttribute("resultList", resultList);

		// ?몄쬆?щ? 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			model.addAttribute("certificationAt", "N");
		} else {
			model.addAttribute("certificationAt", "Y");
		}

		int totCnt = egovQnaService.selectQnaListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/qna/EgovQnaList";
	}

	/**
	 * Q&A?뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param passwordConfirmAt
	 * @param qnaVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/selectQnaDetail.do")
	public String selectQnaDetail(@RequestParam("qaId") String qaId, QnaVO qnaVO,
			@ModelAttribute("searchVO") QnaDefaultVO searchVO, ModelMap model) throws Exception {

		qnaVO.setQaId(qaId);

		// 議고쉶???섏젙泥섎━
		egovQnaService.updateQnaInqireCo(qnaVO);

		QnaVO vo = egovQnaService.selectQnaDetail(qnaVO);

		// ?묒꽦 鍮꾨?踰덊샇瑜??삳뒗??
//		String writngPassword = vo.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 蹂듯샇?뷀븳??
//		vo.setWritngPassword(EgovFileScrty.decode(writngPassword));

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaDetail";
	}

	/**
	 * Q&A?뺣낫瑜??깅줉?섍린 ?꾪븳 ??泥섎━(?몄쬆泥댄겕)
	 * 
	 * @param searchVO
	 * @param qnaManageVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/insertQnaView.do")
	public String insertQnaView(@ModelAttribute("searchVO") QnaVO searchVO, QnaVO qnaVO, Model model) throws Exception {

		// ?몄쬆?щ? 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			model.addAttribute("qnaVO", qnaVO);
			return "egovframework/com/uss/olh/qna/EgovQnaRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String wrterNm = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()); // ?ъ슜?먮챸
		String emailAdres = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getEmail()); // email 二쇱냼

		qnaVO.setWrterNm(wrterNm); // ?묒꽦?먮챸
		qnaVO.setEmailAdres(emailAdres); // email 二쇱냼

		model.addAttribute("qnaVO", qnaVO);

		return "egovframework/com/uss/olh/qna/EgovQnaRegist";

	}

	/**
	 * Q&A?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param qnaVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/qna/selectQnaList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/insertQna.do")
	public String insertQna(@ModelAttribute("searchVO") QnaVO searchVO, @Valid @ModelAttribute("qnaVO") QnaVO qnaVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/qna/EgovQnaRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		qnaVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		qnaVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		// ?묒꽦鍮꾨?踰덊샇瑜??뷀샇???섍린 ?꾪빐??Get
//		String writngPassword = qnaVO.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 ?뷀샇???쒕떎.
//		qnaVO.setWritngPassword(EgovFileScrty.encode(writngPassword));

		egovQnaService.insertQna(qnaVO);

		return "forward:/uss/olh/qna/selectQnaList.do";
	}

	/**
	 * Q&A?뺣낫瑜??섏젙?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param qnaVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaUpdt
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/updateQnaView.do")
	public String updateQnaView(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		QnaVO vo = egovQnaService.selectQnaDetail(qnaVO);

		// ?묒꽦 鍮꾨?踰덊샇瑜??삳뒗??
//		String writngPassword = vo.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 蹂듯샇?뷀븳??
//		vo.setWritngPassword(EgovFileScrty.decode(writngPassword));

		model.addAttribute("qnaVO", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaUpdt";
	}

	/**
	 * Q&A?뺣낫瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param searchVO
	 * @param qnaVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/qna/selectQnaList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/updateQna.do")
	public String updateQna(HttpServletRequest request, @ModelAttribute("searchVO") QnaVO searchVO,
			@ModelAttribute("qnaVO") QnaVO qnaVO, BindingResult bindingResult) throws Exception {


		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/qna/EgovQnaUpdt";
		}

		// --------------------------------------------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");
		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		QnaVO vo = egovQnaService.selectQnaDetail(qnaVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??END
		// --------------------------------------------------------------------------------------------

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		qnaVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		// ?묒꽦鍮꾨?踰덊샇瑜??뷀샇???섍린 ?꾪빐??Get
//		String writngPassword = qnaManageVO.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 ?뷀샇???쒕떎.
//		qnaManageVO.setWritngPassword(EgovFileScrty.encode(writngPassword));

		egovQnaService.updateQna(qnaVO);

		return "forward:/uss/olh/qna/selectQnaList.do";

	}

	/**
	 * Q&A?뺣낫瑜???젣泥섎━?쒕떎.
	 * 
	 * @param qnaVO
	 * @param searchVO
	 * @return "forward:/uss/olh/qna/selectQnaList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/deleteQna.do")
	public String deleteQna(HttpServletRequest request, QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO)
			throws Exception {

		// --------------------------------------------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");

		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		QnaVO vo = egovQnaService.selectQnaDetail(qnaVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??END
		// --------------------------------------------------------------------------------------------

		egovQnaService.deleteQna(qnaVO);

		return "forward:/uss/olh/qna/selectQnaList.do";
	}

	/**
	 * Q&A?듬??뺣낫 紐⑸줉??議고쉶?쒕떎. (pageing)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaAnswerList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "Q&A?듬?愿由?, order = 551, gid = 50)
	@RequestMapping(value = "/uss/olh/qna/selectQnaAnswerList.do")
	public String selectQnaAnswerList(@ModelAttribute("searchVO") QnaVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.SiteList */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<QnaVO> resultList = egovQnaService.selectQnaAnswerList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovQnaService.selectQnaAnswerListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerList";
	}

	/**
	 * Q&A?듬??뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param qnaVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaAnswerDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/selectQnaAnswerDetail.do")
	public String selectQnaAnswerDetail(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		QnaVO vo = egovQnaService.selectQnaDetail(qnaVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerDetail";
	}

	/**
	 * Q&A?듬??뺣낫瑜??섏젙?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param qnaVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/qna/EgovQnaAnswerUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/updateQnaAnswerView.do")
	public String updateQnaAnswerView(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM028");

		List<CmmnDetailCode> qnaProcessSttusCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("qnaProcessSttusCode", qnaProcessSttusCode);

		QnaVO resultVO = egovQnaService.selectQnaDetail(qnaVO);
		model.addAttribute("qnaVO", resultVO);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerUpdt";
	}

	/**
	 * Q&A?듬??뺣낫瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param qnaVO
	 * @param searchVO
	 * @return "forward:/uss/olh/qnm/selectQnaAnswerList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/qna/updateQnaAnswer.do")
	public String updateQnaAnswer(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO) throws Exception {

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		qnaVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovQnaService.updateQnaAnswer(qnaVO);

		return "forward:/uss/olh/qna/selectQnaAnswerList.do";

	}

}
