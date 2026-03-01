package egovframework.com.cop.smt.wmr.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.resolver.EgovSecurityMap;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.wmr.service.EgovWikMnthngReprtService;
import egovframework.com.cop.smt.wmr.service.ReportrVO;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprt;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprtVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 二쇨컙?붽컙蹂닿퀬?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 二쇨컙?붽컙蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶, ?뱀씤湲곕뒫???쒓났?쒕떎.
 * - 二쇨컙?붽컙蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @since 19-7-2010 ?ㅼ쟾 10:12:47
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.07.19  ?μ쿋??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.06  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2025.06.12  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovWikMnthngReprtController {

	@Resource(name = "EgovWikMnthngReprtService")
	protected EgovWikMnthngReprtService wikMnthngReprtService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

    // 泥⑤??뚯씪 愿??
	@Resource(name="EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	// Logger log = Logger.getLogger(this.getClass());

	/**
	 * 蹂닿퀬???뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ReportrVO
	 * @return String
	 *
	 * @param reportrVO
	 */
	@RequestMapping("/cop/smt/wmr/selectReportrListPopup.do")
	public String selectReportrListPopup(@ModelAttribute("searchVO") ReportrVO reportrVO, ModelMap model)
			throws Exception {
		return "egovframework/com/cop/smt/wmr/EgovReportrListPopup";
	}

	/**
	 * 蹂닿퀬???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ReportrVO
	 * @return String
	 *
	 * @param reportrVO
	 */
	@RequestMapping("/cop/smt/wmr/selectReportrList.do")
	public String selectReportrList(@ModelAttribute("searchVO") ReportrVO reportrVO, ModelMap model) throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		// reportrVO.setUniqId(user.getUniqId());

		reportrVO.setPageUnit(propertyService.getInt("pageUnit"));
		reportrVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(reportrVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(reportrVO.getPageUnit());
		paginationInfo.setPageSize(reportrVO.getPageSize());

		reportrVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		reportrVO.setLastIndex(paginationInfo.getLastRecordIndex());
		reportrVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = wikMnthngReprtService.selectReportrList(reportrVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/wmr/EgovReportrList";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprtVO
	 */
	@IncludedInfo(name = "二쇨컙/?붽컙蹂닿퀬愿由?, order = 410, gid = 40)
	@RequestMapping("/cop/smt/wmr/selectWikMnthngReprtList.do")
	public String selectWikMnthngReprtList(@ModelAttribute("searchVO") WikMnthngReprtVO wikMnthngReprtVO,
			ModelMap model) throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		wikMnthngReprtVO.setPageUnit(propertyService.getInt("pageUnit"));
		wikMnthngReprtVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(wikMnthngReprtVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(wikMnthngReprtVO.getPageUnit());
		paginationInfo.setPageSize(wikMnthngReprtVO.getPageSize());

		wikMnthngReprtVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		wikMnthngReprtVO.setLastIndex(paginationInfo.getLastRecordIndex());
		wikMnthngReprtVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		wikMnthngReprtVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<String, Object> map = wikMnthngReprtService.selectWikMnthngReprtList(wikMnthngReprtVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtList";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫???깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/addWikMnthngReprt.do")
	public String addWikMnthngReprt(@ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtRegist";

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.KOREA);
		wikMnthngReprtVO.setReprtDe(formatter.format(new java.util.Date()));
		wikMnthngReprtVO.setWrterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		wikMnthngReprtVO.setWrterNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));
		wikMnthngReprtVO.setWrterClsfNm(wikMnthngReprtService
				.selectWrterClsfNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId())));

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫???섏젙?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/modifyWikMnthngReprt.do")
	public String modifyWikMnthngReprt(@ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		wikMnthngReprtVO.setSearchId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		WikMnthngReprtVO resultVO = wikMnthngReprtService.selectWikMnthngReprt(wikMnthngReprtVO);
		resultVO.setSearchCnd(wikMnthngReprtVO.getSearchCnd());
		resultVO.setSearchWrd(wikMnthngReprtVO.getSearchWrd());
		resultVO.setSearchDe(wikMnthngReprtVO.getSearchDe());
		resultVO.setSearchBgnDe(wikMnthngReprtVO.getSearchBgnDe());
		resultVO.setSearchEndDe(wikMnthngReprtVO.getSearchEndDe());
		resultVO.setSearchSttus(wikMnthngReprtVO.getSearchSttus());
		resultVO.setPageIndex(wikMnthngReprtVO.getPageIndex());
		model.addAttribute("wikMnthngReprtVO", resultVO);

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtUpdt";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprtVO
	 */
	@RequestMapping("/cop/smt/wmr/selectWikMnthngReprt.do")
	public String selectWikMnthngReprt(@ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO,
			ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		wikMnthngReprtVO.setSearchId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		WikMnthngReprt wikMnthngReprt = wikMnthngReprtService.selectWikMnthngReprt(wikMnthngReprtVO);
		model.addAttribute("wikMnthngReprt", wikMnthngReprt);

		/*
		 * 怨듯넻肄붾뱶 ?곗꽑?쒖쐞 議고쉶
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM060");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("reprtSe", listComCode);

		// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		model.addAttribute("uniqId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		return "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtDetail";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/updateWikMnthngReprt.do")
	public String updateWikMnthngReprt(final MultipartHttpServletRequest multiRequest, EgovSecurityMap securityMap,
			@Valid @ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			WikMnthngReprt wikMnthngReprt = wikMnthngReprtService.selectWikMnthngReprt(wikMnthngReprtVO);
			model.addAttribute("wikMnthngReprt", wikMnthngReprt);

			// ?뚯씪?낅줈???쒗븳
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

			model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
			model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

			return "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtUpdt";
		}

		if (isAuthenticated) {
			/*
			 * ***************************************************************** // 泥⑤??뚯씪 愿??
			 * ID ?앹꽦 start....
			 */
			String atchFileId = wikMnthngReprtVO.getAtchFileId();

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = securityMap.get("atchFileAt") == null ? "" : (String) securityMap.get("atchFileAt");
				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					wikMnthngReprtVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			wikMnthngReprtVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			// ?섏젙 ???묒꽦?먮쭔 媛?ν븯?꾨줉
			wikMnthngReprtVO.setSearchId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			wikMnthngReprtService.updateWikMnthngReprt(wikMnthngReprtVO);
		}

		return "forward:/cop/smt/wmr/selectWikMnthngReprtList.do";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/insertWikMnthngReprt.do")
	public String insertWikMnthngReprt(final MultipartHttpServletRequest multiRequest,
			@Valid @ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtRegist";

		if(bindingResult.hasErrors()){

			// ?뚯씪?낅줈???쒗븳
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

			model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
			model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);
			return sLocationUrl;
		}

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		wikMnthngReprtVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// ?꾩씠???ㅼ젙
		wikMnthngReprtVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		wikMnthngReprtVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		wikMnthngReprtService.insertWikMnthngReprt(wikMnthngReprtVO);
		sLocationUrl = "forward:/cop/smt/wmr/selectWikMnthngReprtList.do";

		return sLocationUrl;
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/deleteWikMnthngReprt.do")
	public String deleteWikMnthngReprt(@ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO, ModelMap model) throws Exception{
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = wikMnthngReprtVO.getAtchFileId();

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		wikMnthngReprtVO.setSearchId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		wikMnthngReprtService.deleteWikMnthngReprt(wikMnthngReprtVO);
		return "forward:/cop/smt/wmr/selectWikMnthngReprtList.do";
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??뱀씤?쒕떎.
	 * 
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 *
	 * @param wikMnthngReprt
	 */
	@RequestMapping("/cop/smt/wmr/confirmWikMnthngReprt.do")
	public String confirmWikMnthngReprt(@ModelAttribute("wikMnthngReprtVO") WikMnthngReprtVO wikMnthngReprtVO, ModelMap model) throws Exception{
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		wikMnthngReprtVO.setSearchId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		if (isAuthenticated) {
			wikMnthngReprtService.confirmWikMnthngReprt(wikMnthngReprtVO);
		}

		return "forward:/cop/smt/wmr/selectWikMnthngReprtList.do";
	}

}
