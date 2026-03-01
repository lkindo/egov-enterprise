package egovframework.com.cop.smt.dsm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;
import egovframework.com.cop.smt.dsm.service.EgovDiaryManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?쇱?愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2020.10.28  ?좎슜??         ?뚯씪 ?낅줈???섏젙 (multiRequest.getFiles)
 *   2025.06.10  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovDiaryManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovDiaryManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovDiaryManageService")
	private EgovDiaryManageService egovDiaryManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * ?쇱?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param diaryManageVO
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/EgovDiaryManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?쇱?愿由?, order = 340, gid = 40)
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageList.do")
	public String egovDiaryManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, DiaryManageVO diaryManageVO, ModelMap model) throws Exception {

//		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String)commandMap.get("searchMode");

		/** EgovPropertyService.sample */
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

		if (commandMap.get("schdulId") != null) {
			searchVO.setSearchCondition("SCHDUL_ID");
			searchVO.setSearchKeyword((String) commandMap.get("schdulId"));
		}

		List<EgovMap> resultList = egovDiaryManageService.selectDiaryManageList(searchVO);
		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovDiaryManageService.selectDiaryManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/dsm/EgovDiaryManageList";
	}

	/**
	 * ?쇱?愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param diaryManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/EgovDiaryManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageDetail.do")
	public String egovDiaryManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO, DiaryManageVO diaryManageVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/dsm/EgovDiaryManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovDiaryManageService.deleteDiaryManage(diaryManageVO);
			sLocationUrl = "redirect:/cop/smt/dsm/EgovDiaryManageList.do";
		} else {
			model.addAttribute("diaryManageVO", egovDiaryManageService.selectDiaryManageDetail(diaryManageVO));
		}

		return sLocationUrl;
	}

	/**
	 * ?쇱?愿由щ? ?섏젙?쒕떎. / 珥덇린?섏씠吏
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param diaryManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/EgovDiaryManageModify"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageModify.do")
	public String diaryManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, DiaryManageVO diaryManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/dsm/EgovDiaryManageModify";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		model.addAttribute("diaryManageVO", egovDiaryManageService.selectDiaryManageDetail(diaryManageVO));

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * ?쇱?愿由щ? ?섏젙?쒕떎. / ?섏젙泥섎━?묒뾽
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param commandMap
	 * @param diaryManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/EgovDiaryManageModifyActor"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageModifyActor.do")
	public String diaryManageModifyActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("diaryManageVO") DiaryManageVO diaryManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		String sLocationUrl = "egovframework/com/cop/smt/dsm/EgovDiaryManageModify";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {

				return sLocationUrl;
			}
			/*
			 * ***************************************************************** // ?꾩씠?붿꽕??
			 */
			diaryManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			diaryManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			/*
			 * ***************************************************************** // 泥⑤??뚯씪 愿??
			 * ID ?앹꽦 start....
			 */
			String atchFileId = diaryManageVO.getAtchFileId();

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = commandMap.get("atchFileAt") == null ? "" : (String) commandMap.get("atchFileAt");
				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DIARY_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					diaryManageVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DIARY_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			/*
			 * ***************************************************************** // ?쇱??뺣낫
			 * ?낅뜲?댄듃
			 */
			egovDiaryManageService.updateDiaryManage(diaryManageVO);
			sLocationUrl = "redirect:/cop/smt/dsm/EgovDiaryManageList.do";
		}

		return sLocationUrl;
	}

	/**
	 * ?쇱?愿由щ? ?깅줉?쒕떎. / ?깅줉 珥덇린?섏씠吏
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param diaryManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/cop/smt/dsm/EgovDiaryManageRegist"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageRegist.do")
	public String diaryManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("diaryManageVO") DiaryManageVO diaryManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		String sLocationUrl = "egovframework/com/cop/smt/dsm/EgovDiaryManageRegist";

		return sLocationUrl;
	}

	/**
	 * ?쇱?愿由щ? ?깅줉?쒕떎. / ?깅줉泥섎━?묒뾽
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param commandMap
	 * @param diaryManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/DiaryManageRegistActor"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/dsm/EgovDiaryManageRegistActor.do")
	public String diaryManageRegistActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("diaryManageVO") DiaryManageVO diaryManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		String sLocationUrl = "egovframework/com/cop/smt/dsm/EgovDiaryManageRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {

				return sLocationUrl;
			}

			// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
			List<FileVO> fvoList = null;
			String atchFileId = "";

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "DIARY_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
			}

			// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
			diaryManageVO.setAtchFileId(atchFileId);

			// ?꾩씠???ㅼ젙
			diaryManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			diaryManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovDiaryManageService.insertDiaryManage(diaryManageVO);
			sLocationUrl = "redirect:/cop/smt/dsm/EgovDiaryManageList.do";
		}

		return sLocationUrl;
	}

}
