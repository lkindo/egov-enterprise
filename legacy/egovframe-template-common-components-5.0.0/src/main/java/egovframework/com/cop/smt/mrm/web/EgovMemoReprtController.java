package egovframework.com.cop.smt.mrm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.mrm.service.EgovMemoReprtService;
import egovframework.com.cop.smt.mrm.service.MemoReprt;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;
import egovframework.com.cop.smt.mrm.service.ReportrVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 硫붾え蹂닿퀬?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붾え蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @since 19-7-2010 ?ㅼ쟾 10:14:53
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
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2025.06.11  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */

@Controller
public class EgovMemoReprtController {

	@Resource(name = "EgovMemoReprtService")
	protected EgovMemoReprtService memoReprtService;

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
	@RequestMapping("/cop/smt/mrm/selectReportrListPopup.do")
	public String selectReportrListPopup(@ModelAttribute("searchVO") ReportrVO reportrVO, ModelMap model)
			throws Exception {
		return "egovframework/com/cop/smt/mrm/EgovReportrListPopup";
	}

	/**
	 * 蹂닿퀬???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ReportrVO
	 * @return String
	 * 
	 * @param reportrVO
	 */
	@RequestMapping("/cop/smt/mrm/selectReportrList.do")
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

		Map<String, Object> map = memoReprtService.selectReportrList(reportrVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/mrm/EgovReportrList";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprtVO
	 * @param model
	 */
	@IncludedInfo(name = "硫붾え蹂닿퀬", order = 430, gid = 40)
	@RequestMapping("/cop/smt/mrm/selectMemoReprtList.do")
	public String selectMemoReprtList(@ModelAttribute("searchVO") MemoReprtVO memoReprtVO, ModelMap model)
			throws Exception {
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		memoReprtVO.setPageUnit(propertyService.getInt("pageUnit"));
		memoReprtVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(memoReprtVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(memoReprtVO.getPageUnit());
		paginationInfo.setPageSize(memoReprtVO.getPageSize());

		memoReprtVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		memoReprtVO.setLastIndex(paginationInfo.getLastRecordIndex());
		memoReprtVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		memoReprtVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<String, Object> map = memoReprtService.selectMemoReprtList(memoReprtVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/mrm/EgovMemoReprtList";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprtVO
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/selectMemoReprt.do")
	public String selectMemoReprt(@ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, ModelMap model)
			throws Exception {

		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		memoReprtVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		MemoReprt memoReprt = memoReprtService.selectMemoReprt(memoReprtVO);
		model.addAttribute("memoReprt", memoReprt);

		model.addAttribute("uniqId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		if ((loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()))
				.equals(memoReprt.getReportrId())) {
			memoReprtService.readMemoReprt(memoReprt);
		}
		return "egovframework/com/cop/smt/mrm/EgovMemoReprtDetail";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫???깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/addMemoReprt.do")
	public String addMemoReprt(@ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/mrm/EgovMemoReprtRegist";

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
		memoReprtVO.setReprtDe(formatter.format(new java.util.Date()));
		memoReprtVO.setWrterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		memoReprtVO.setWrterNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));
		memoReprtVO.setWrterClsfNm(memoReprtService
				.selectWrterClsfNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId())));

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫???섏젙?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/modifyMemoReprt.do")
	public String modifyMemoReprt(@ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		memoReprtVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		MemoReprtVO resultVO = memoReprtService.selectMemoReprt(memoReprtVO);
		resultVO.setSearchCnd(memoReprtVO.getSearchCnd());
		resultVO.setSearchWrd(memoReprtVO.getSearchWrd());
		resultVO.setSearchBgnDe(memoReprtVO.getSearchBgnDe());
		resultVO.setSearchEndDe(memoReprtVO.getSearchEndDe());
		resultVO.setSearchSttus(memoReprtVO.getSearchSttus());
		resultVO.setSearchDrctMatter(memoReprtVO.getSearchDrctMatter());
		resultVO.setPageIndex(memoReprtVO.getPageIndex());
		model.addAttribute("memoReprtVO", resultVO);

		return "egovframework/com/cop/smt/mrm/EgovMemoReprtUpdt";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/updateMemoReprt.do")
	public String updateMemoReprt(final MultipartHttpServletRequest multiRequest, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			MemoReprt memoReprt = memoReprtService.selectMemoReprt(memoReprtVO);
			model.addAttribute("memoReprt", memoReprt);
			return "egovframework/com/cop/smt/mrm/EgovMemoReprtUpdt";
		}

		if (isAuthenticated) {
			/*
			 * ***************************************************************** // 泥⑤??뚯씪 愿??
			 * ID ?앹꽦 start....
			 */
			String atchFileId = memoReprtVO.getAtchFileId();

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = commandMap.get("atchFileAt") == null ? "" : (String) commandMap.get("atchFileAt");
				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					memoReprtVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			memoReprtVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			memoReprtService.updateMemoReprt(memoReprtVO);
		}

		return "forward:/cop/smt/mrm/selectMemoReprtList.do";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??吏?쒖궗??쓣 ?깅줉?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@SuppressWarnings("unused")
	@RequestMapping("/cop/smt/mrm/updateMemoReprtDrctMatter.do")
	public String updateMemoReprtDrctMatter(@ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			memoReprtService.updateMemoReprtDrctMatter(memoReprtVO);
		}

		return "forward:/cop/smt/mrm/selectMemoReprtList.do";
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/insertMemoReprt.do")
	public String insertMemoReprt(final MultipartHttpServletRequest multiRequest,
			@Valid @ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/mrm/EgovMemoReprtRegist";

		if (bindingResult.hasErrors()) {

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
		memoReprtVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// ?꾩씠???ㅼ젙
		memoReprtVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		memoReprtVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		memoReprtService.insertMemoReprt(memoReprtVO);
		sLocationUrl = "forward:/cop/smt/mrm/selectMemoReprtList.do";

		return sLocationUrl;
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * @return String - 由ы꽩 URL
	 * 
	 * @param memoReprt
	 * @param model
	 */
	@RequestMapping("/cop/smt/mrm/deleteMemoReprt.do")
	public String deleteMemoReprt(@ModelAttribute("memoReprtVO") MemoReprtVO memoReprtVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		memoReprtVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = memoReprtVO.getAtchFileId();

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		memoReprtService.deleteMemoReprt(memoReprtVO);
		return "forward:/cop/smt/mrm/selectMemoReprtList.do";
	}

}
