package egovframework.com.uss.olp.cns.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cmm.util.EgovXssChecker;
import egovframework.com.uss.olp.cns.service.CnsltManageDefaultVO;
import egovframework.com.uss.olp.cns.service.CnsltManageVO;
import egovframework.com.uss.olp.cns.service.EgovCnsltManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * ?곷떞?댁슜??泥섎━?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
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
 *   2025.08.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.08.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessarySemicolon(?꾩슂?녿뒗 ; 臾몄옣 議댁옱)
 *
 *      </pre>
 */
@Controller
public class EgovCnsltManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovCnsltManageController.class);

	@Resource(name = "CnsltManageService")
	private EgovCnsltManageService cnsltManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 媛쒕퀎 諛고룷??硫붿씤硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param model
	 * @return "/uss/sam/cpy/"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/cns/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/cns/EgovMain";
	}

	/**
	 * 硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param model
	 * @return "/uss/sam/cpy/EgovLeft"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/cns/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/cns/EgovLeft";
	}

	/**
	 * ?곷떞?뺣낫 紐⑸줉??議고쉶?쒕떎. (pageing)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?곷떞愿由?, order = 580, gid = 50)
	@RequestMapping(value = "/uss/olp/cns/CnsltListInqire.do")
	public String selectCnsltList(@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model)
			throws Exception {

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

		List<EgovMap> resultList = cnsltManageService.selectCnsltList(searchVO);
		model.addAttribute("resultList", resultList);

		// ?몄쬆?щ? 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		// isAuthenticated = false;

		if (!isAuthenticated) {

			model.addAttribute("certificationAt", "N");

		} else {

			model.addAttribute("certificationAt", "Y");

		}

		int totCnt = cnsltManageService.selectCnsltListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/cns/EgovCnsltListInqire";
	}

	/**
	 * ?곷떞?뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param passwordConfirmAt
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltDetailInqire"
	 * @throws Exception
	 */
	@SuppressWarnings("deprecation")
	@RequestMapping("/uss/olp/cns/CnsltDetailInqire.do")
	public String selectCnsltListDetail(@RequestParam("passwordConfirmAt") String passwordConfirmAt,
			CnsltManageVO cnsltManageVO, @ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model)
			throws Exception {

		CnsltManageVO vo = cnsltManageService.selectCnsltListDetail(cnsltManageVO);

		vo.setPasswordConfirmAt(passwordConfirmAt); // ?묒꽦鍮꾨?踰덊샇 ?뺤씤?щ?

		// ?묒꽦 鍮꾨?踰덊샇瑜??삳뒗??
		String writngPassword = vo.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 蹂듯샇?뷀븳??
		vo.setWritngPassword(EgovFileScrty.decode(writngPassword));

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olp/cns/EgovCnsltDetailInqire";
	}

	/**
	 * Q&A 議고쉶?섎? ?섏젙泥섎━ ?쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @return "forward:/uss/olp/cns/CnsltDetailInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cns/CnsltInqireCoUpdt.do")
	public String updateCnsltInqireCo(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO) throws Exception {

		cnsltManageService.updateCnsltInqireCo(cnsltManageVO);

		return "forward:/uss/olp/cns/CnsltDetailInqire.do";

	}

	/**
	 * 濡쒓렇?몄씠???ㅻ챸?뺤씤 泥섎━瑜??쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return /uss/olp/cns/EgovLoginRealnmChoice
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cns/LoginRealnmChoice.do")
	public String selectLoginRealnmChoice(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, Model model) throws Exception {

		model.addAttribute("CnsltManageVO", new CnsltManageVO());

		return "egovframework/com/uss/olp/cns/EgovCnsltLoginRealnmChoice";
	}

	/**
	 * ?곷떞?뺣낫瑜??깅줉?섍린 ?꾪븳 ??泥섎━(?몄쬆泥댄겕)
	 * 
	 * @param searchVO
	 * @param cnsltManageVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltDtlsRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cns/CnsltDtlsRegistView.do")
	public String insertCnsltDtlsView(@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO,
			CnsltManageVO cnsltManageVO, Model model) throws Exception {

		// ?몄쬆?щ? 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		// isAuthenticated = false;

		if (!isAuthenticated) {

			model.addAttribute("result", cnsltManageVO);

			return "egovframework/com/uss/olp/cns/EgovCnsltDtlsRegist";

		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String wrterNm = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()); // ?ъ슜?먮챸
		String emailAdres = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getEmail()); // email 二쇱냼

		cnsltManageVO.setWrterNm(wrterNm); // ?묒꽦?먮챸
		cnsltManageVO.setEmailAdres(emailAdres); // email 二쇱냼

		model.addAttribute("result", cnsltManageVO);

		return "egovframework/com/uss/olp/cns/EgovCnsltDtlsRegist";
	}

	/**
	 * ?곷떞?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param cnsltManageVO
	 * @param bindingResult
	 * @param model
	 * @return "forward:/uss/olp/cns/CnsltListInqire.do"
	 * @throws Exception
	 */
	@SuppressWarnings("deprecation")
	@RequestMapping("/uss/olp/cns/CnsltDtlsRegist.do")
	public String insertCnsltDtls(final MultipartHttpServletRequest multiRequest, // 泥⑤??뚯씪???꾪븳...
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO,
			@ModelAttribute("cnsltManageVO") CnsltManageVO cnsltManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {

			return "egovframework/com/uss/olp/cns/EgovCnsltDtlsRegist";

		}

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "CNSLT_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		cnsltManageVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cnsltManageVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		cnsltManageVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		// ?묒꽦鍮꾨?踰덊샇瑜??뷀샇???섍린 ?꾪빐??Get
		String writngPassword = EgovStringUtil.isNullToString(cnsltManageVO.getWritngPassword());// KISA 蹂댁븞?쎌젏 議곗튂
																									// (2018-10-29, ?ㅼ갹??

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 ?뷀샇???쒕떎.
		cnsltManageVO.setWritngPassword(EgovFileScrty.encode(writngPassword));

		cnsltManageService.insertCnsltDtls(cnsltManageVO);

		return "forward:/uss/olp/cns/CnsltListInqire.do";
	}

	/**
	 * ?묒꽦 鍮꾨?踰덊샇瑜??뺤씤?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltPasswordConfirm"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cns/CnsltPasswordConfirmView.do")
	public String selectPasswordConfirmView(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, Model model) throws Exception {

		model.addAttribute("CnsltManageVO", new CnsltManageVO());

		return "egovframework/com/uss/olp/cns/EgovCnsltPasswordConfirm";
	}

	/**
	 * ?묒꽦 鍮꾨?踰덊샇瑜??뺤씤?쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "forward:/uss/olp/cns/CnsltDetailInqire.do"
	 * @throws Exception
	 */
	@SuppressWarnings("deprecation")
	@RequestMapping("/uss/olp/cns/CnsltPasswordConfirm.do")
	public String selectPasswordConfirm(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, Model model) throws Exception {

		// ?묒꽦鍮꾨?踰덊샇瑜??뷀샇???섍린 ?꾪빐??Get
		String writngPassword = EgovStringUtil.isNullToString(cnsltManageVO.getWritngPassword());// KISA 蹂댁븞?쎌젏 議곗튂
																									// (2018-10-29, ?ㅼ갹??

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 ?뷀샇???쒕떎.
		cnsltManageVO.setWritngPassword(EgovFileScrty.encode(writngPassword));

		int searchCnt = cnsltManageService.selectCnsltPasswordConfirmCnt(cnsltManageVO);

		if (searchCnt > 0) { // ?묒꽦 鍮꾨?踰덊샇媛 ?쇱튂?섎뒗 寃쎌슦

			// ?곷떞?뺣낫瑜??섏젙?????덈뒗 ?붾㈃?쇰줈 ?대룞.
			return "forward:/uss/olp/cns/CnsltDtlsUpdtView.do";

		} else { // ?묒꽦鍮꾨?踰덊샇媛 ?由곌꼍??

			// ?묒꽦鍮꾨?踰덊샇 ?뺤씤 寃곌낵 ?명똿.
			// cnsltManageVO.setPasswordConfirmAt("N");

			String passwordConfirmAt = "N";

			// Q&A ?곸꽭議고쉶 ?붾㈃?쇰줈 ?대룞.
			return "forward:/uss/olp/cns/CnsltDetailInqire.do?passwordConfirmAt=" + passwordConfirmAt;

		}

	}

	/**
	 * ?곷떞?뺣낫瑜??섏젙?섍린 ?꾪븳 ??泥섎━(鍮꾨?踰덊샇 蹂듯샇??
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltDtlsUpdt"
	 * @throws Exception
	 */
	@SuppressWarnings("deprecation")
	@RequestMapping("/uss/olp/cns/CnsltDtlsUpdtView.do")
	public String updateCnsltDtlsView(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model) throws Exception {

		CnsltManageVO vo = cnsltManageService.selectCnsltListDetail(cnsltManageVO);

		// ?묒꽦 鍮꾨?踰덊샇瑜??삳뒗??
		String writngPassword = vo.getWritngPassword();

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 蹂듯샇?뷀븳??
		vo.setWritngPassword(EgovFileScrty.decode(writngPassword));

		// 蹂듯샇?붾맂 ?⑥뒪?뚮뱶瑜??섍릿??.
		model.addAttribute("cnsltManageVO", vo);

		// result?먮룄 ?명똿(jstl ?ъ슜???꾪빐)
		model.addAttribute(selectCnsltListDetail("Y", cnsltManageVO, searchVO, model));

		return "egovframework/com/uss/olp/cns/EgovCnsltDtlsUpdt";
	}

	/**
	 * ?곷떞?뺣낫瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param atchFileAt
	 * @param multiRequest
	 * @param searchVO
	 * @param cnsltManageVO
	 * @param bindingResult
	 * @param model
	 * @return "forward:/uss/olp/cns/CnsltListInqire.do"
	 * @throws Exception
	 */
	@SuppressWarnings("deprecation")
	@RequestMapping("/uss/olp/cns/CnsltDtlsUpdt.do")
	public String updateCnsltDtls(@RequestParam("atchFileAt") String atchFileAt,
			final MultipartHttpServletRequest multiRequest, @ModelAttribute("searchVO") CnsltManageDefaultVO searchVO,
			@ModelAttribute("cnsltManageVO") CnsltManageVO cnsltManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {

			return "egovframework/com/uss/olp/cns/EgovCnsltDtlsUpdt";

		}

		// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
		String atchFileId = cnsltManageVO.getAtchFileId();

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {

			if ("N".equals(atchFileAt)) {
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "CNSLT_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(fvoList);

				// 泥⑤??뚯씪 ID ?뗮똿
				cnsltManageVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int fileKeyParam = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "CNSLT_", fileKeyParam, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}
		// 泥⑤??뚯씪 愿??ID ?앹꽦 end...

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cnsltManageVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		// ?묒꽦鍮꾨?踰덊샇瑜??뷀샇???섍린 ?꾪빐??Get
		String writngPassword = EgovStringUtil.isNullToString(cnsltManageVO.getWritngPassword());// KISA 蹂댁븞?쎌젏 議곗튂
																									// (2018-10-29, ?ㅼ갹??

		// EgovFileScrty Util???덈뒗 ?뷀샇??紐⑤뱢???곸슜?댁꽌 ?뷀샇???쒕떎.
		cnsltManageVO.setWritngPassword(EgovFileScrty.encode(writngPassword));

		cnsltManageService.updateCnsltDtls(cnsltManageVO);

		return "forward:/uss/olp/cns/CnsltListInqire.do";

	}

	/**
	 * ?곷떞?뺣낫瑜???젣泥섎━?쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @return "forward:/uss/olp/cns/CnsltListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cns/CnsltDtlsDelete.do")
	public String deleteCnsltDtls(HttpServletRequest request, CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO) throws Exception {

		// --------------------------------------------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");

		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		CnsltManageVO vo = cnsltManageService.selectCnsltListDetail(cnsltManageVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??END
		// --------------------------------------------------------------------------------------------

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = cnsltManageVO.getAtchFileId();

		cnsltManageService.deleteCnsltDtls(cnsltManageVO);

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		return "forward:/uss/olp/cns/CnsltListInqire.do";
	}

	/**
	 * Q&A?듬??뺣낫 紐⑸줉??議고쉶?쒕떎. (pageing)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltAnswerListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?곷떞?듬?愿由?, order = 581, gid = 50)
	@RequestMapping(value = "/uss/olp/cnm/CnsltAnswerListInqire.do")
	public String selectCnsltAnswerList(@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model)
			throws Exception {

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

		List<EgovMap> resultList = cnsltManageService.selectCnsltAnswerList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cnsltManageService.selectCnsltAnswerListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/cns/EgovCnsltAnswerListInqire";
	}

	/**
	 * Q&A?듬??뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltAnswerDetailInqire"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cnm/CnsltAnswerDetailInqire.do")
	public String selectCnsltAnswerListDetail(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model) throws Exception {

		CnsltManageVO vo = cnsltManageService.selectCnsltListDetail(cnsltManageVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olp/cns/EgovCnsltAnswerDetailInqire";
	}

	/**
	 * Q&A?듬??뺣낫瑜??섏젙?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶泥섎━)
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olp/cns/EgovCnsltDtlsAnswerUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cnm/CnsltDtlsAnswerUpdtView.do")
	public String updateCnsltDtlsAnswerView(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO, ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		comDefaultCodeVO.setCodeId("COM028");

		List<CmmnDetailCode> resultList = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		model.addAttribute("resultList", resultList);

		// 蹂?섎챸? CoC ???곕씪
		model.addAttribute(selectCnsltAnswerListDetail(cnsltManageVO, searchVO, model));

		return "egovframework/com/uss/olp/cns/EgovCnsltDtlsAnswerUpdt";
	}

	/**
	 * Q&A?듬??뺣낫瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param cnsltManageVO
	 * @param searchVO
	 * @return "forward:/uss/olp/cnm/CnsltAnswerListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olp/cnm/CnsltDtlsAnswerUpdt.do")
	public String updateCnsltDtlsAnswer(CnsltManageVO cnsltManageVO,
			@ModelAttribute("searchVO") CnsltManageDefaultVO searchVO) throws Exception {

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cnsltManageVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		cnsltManageService.updateCnsltDtlsAnswer(cnsltManageVO);

		return "forward:/uss/olp/cnm/CnsltAnswerListInqire.do";

	}

}
