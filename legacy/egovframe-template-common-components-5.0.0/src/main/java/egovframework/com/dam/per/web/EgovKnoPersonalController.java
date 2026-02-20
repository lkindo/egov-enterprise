package egovframework.com.dam.per.web;

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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.dam.map.mat.service.EgovMapMaterialService;
import egovframework.com.dam.map.mat.service.MapMaterialVO;
import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import egovframework.com.dam.per.service.EgovKnoPersonalService;
import egovframework.com.dam.per.service.KnoPersonal;
import egovframework.com.dam.per.service.KnoPersonalVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 媛쒖씤吏?앹젙蹂댁뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛쒖씤吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 媛쒖씤吏?앹젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.08.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.12  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2024.10.29  沅뚰깭??         紐⑸줉?쇰줈 ?뚯븘????寃??議곌굔???좎??섎룄濡??섏젙(#1)
 *   2025.06.17  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovKnoPersonalController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovKnoPersonalController.class);

	@Resource(name = "KnoPersonalService")
	public EgovKnoPersonalService knoPersonalService;

	@Resource(name = "MapTeamService")
	private EgovMapTeamService mapTeamService;

	@Resource(name = "MapMaterialService")
	public EgovMapMaterialService mapMaterialService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?깅줉??媛쒖씤吏???뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoPersonalVO - 媛쒖씤吏??VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoPersonalVO
	 */
	@IncludedInfo(name = "媛쒖씤吏?앷?由?, listUrl = "/dam/per/EgovComDamPersonalList.do", order = 1250, gid = 80)
	@RequestMapping(value = "/dam/per/EgovComDamPersonalList.do")
	public String selectKnoPersonalList(@ModelAttribute("searchVO") KnoPersonalVO searchVO, ModelMap model)
			throws Exception {
		LOGGER.debug("searchVO={}", searchVO);
		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		/** EgovPropertyService.mapMaterial */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		searchVO.setFrstRegisterId(loginVO.getUniqId());
		List<KnoPersonalVO> resultList = knoPersonalService.selectKnoPersonalList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = knoPersonalService.selectKnoPersonalTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("searchVO", searchVO);

		return "egovframework/com/dam/per/EgovComDamPersonalList";
	}

	/**
	 * 媛쒖씤吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoPersonalVO - 媛쒖씤吏?앹젙蹂?VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoPersonalVO
	 */
	@RequestMapping(value = "/dam/per/EgovComDamPersonal.do")
	public String selectKnoPersonal(KnoPersonalVO knoPersonal, ModelMap model) throws Exception {
		KnoPersonal result = knoPersonalService.selectKnoPersonal(knoPersonal);
		model.addAttribute("result", result);
		model.addAttribute("searchVO", knoPersonal);
		return "egovframework/com/dam/per/EgovComDamPersonalDetail";
	}

	/**
	 * 媛쒖씤吏???뺣낫瑜??깅줉??
	 * 
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoNm
	 */
	@RequestMapping(value = "/dam/per/EgovComDamPersonalRegistView.do")
	public String insertKnoPersonalView(KnoPersonalVO knoPersonal, ModelMap model) throws Exception {
		setInsertKnoPersonalViewModel(knoPersonal, model);
		return "egovframework/com/dam/per/EgovComDamPersonalRegist";
	}

	/**
	 * 媛쒖씤吏???뺣낫瑜??깅줉?? 珥덇린媛?
	 * 
	 * @param model
	 * @throws Exception
	 */
	private void setInsertKnoPersonalViewModel(KnoPersonalVO knoPersonal, ModelMap model) throws Exception {
		model.addAttribute("knoPersonal", knoPersonal);
		MapTeamVO mapTeamVO = new MapTeamVO();
		mapTeamVO.setRecordCountPerPage(Integer.MAX_VALUE);
		mapTeamVO.setFirstIndex(0);
		List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(mapTeamVO);
		model.addAttribute("mapTeamList", mapTeamList);

		MapMaterialVO mapMaterialVO = new MapMaterialVO();
		mapMaterialVO.setRecordCountPerPage(Integer.MAX_VALUE);
		mapMaterialVO.setFirstIndex(0);

		List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(mapMaterialVO);
		model.addAttribute("mapMaterialList", mapMaterialList);
	}

	/**
	 * 媛쒖씤吏???뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoNm
	 */
	@PostMapping(value = "/dam/per/EgovComDamPersonalRegist.do")
	public String insertKnoPersonal(final MultipartHttpServletRequest multiRequest, @Valid @ModelAttribute("knoPersonal") KnoPersonalVO knoPersonal,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/dam/per/EgovComDamPersonalRegist";

		if (bindingResult.hasErrors()) {
			setInsertKnoPersonalViewModel(knoPersonal, model);
			return sLocationUrl;
		}

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		// final Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		knoPersonal.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// ?꾩씠???ㅼ젙
		knoPersonal.setFrstRegisterId(loginVO.getUniqId());
		knoPersonal.setLastUpdusrId(loginVO.getUniqId());

		knoPersonalService.insertKnoPersonal(knoPersonal);
		return "forward:/dam/per/EgovComDamPersonalList.do";
	}

	/**
	 * 湲??깅줉 ??媛쒖씤吏???뺣낫瑜??섏젙??
	 * 
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 * @return String - 由ы꽩 Ur
	 *
	 * @param KnoNm
	 */
	@PostMapping(value = "/dam/per/EgovComDamPersonalModifyView.do")
	public String updateKnoPersonalView(KnoPersonalVO knoPersonal, ModelMap model) throws Exception {
		updateKnoPersonalViewInit(knoPersonal, model);
		model.addAttribute("searchVO", knoPersonal);
		return "egovframework/com/dam/per/EgovComDamPersonalModify";
	}

	/**
	 * 湲??깅줉 ??媛쒖씤吏???뺣낫瑜??섏젙?? 珥덇린媛?
	 * 
	 * @param knoPersonal
	 * @param model
	 * @throws Exception
	 */
	private void updateKnoPersonalViewInit(KnoPersonal knoPersonal, ModelMap model) throws Exception {
		KnoPersonal result = knoPersonalService.selectKnoPersonal(knoPersonal);
		model.addAttribute("knoPersonal", result);
	}

	/**
	 * 湲??깅줉 ??媛쒖씤吏???뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 * @return String - 由ы꽩 Ur
	 *
	 * @param KnoNm
	 */
	@PostMapping(value = "/dam/per/EgovComDamPersonalModify.do")
	public String updateKnoPersonal(final MultipartHttpServletRequest multiRequest,
			@RequestParam Map<String, String> commandMap, @Valid @ModelAttribute("knoPersonal") KnoPersonal knoPersonal,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/dam/per/EgovComDamPersonalModify";

		if (bindingResult.hasErrors()) {
			updateKnoPersonalViewInit(knoPersonal, model);
			return sLocationUrl;
		}

		/*
		 * ***************************************************************** // ?꾩씠???ㅼ젙
		 */
		if (loginVO != null) {
			knoPersonal.setFrstRegisterId(loginVO.getUniqId());
			knoPersonal.setLastUpdusrId(loginVO.getUniqId());
		}

		/*
		 * ***************************************************************** // 泥⑤??뚯씪 愿??
		 * ID ?앹꽦 start....
		 */
		String atchFileId = knoPersonal.getAtchFileId();

		// final Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			String atchFileAt = commandMap.get("atchFileAt");
			if ("N".equals(atchFileAt)) {
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(fvoList);

				// 泥⑤??뚯씪 ID ?뗮똿
				knoPersonal.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int fileKeyParam = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}

		// ???
		knoPersonalService.updateKnoPersonal(knoPersonal);
		sLocationUrl = "forward:/dam/per/EgovComDamPersonalList.do";
		return sLocationUrl;
	}

	/**
	 * 湲??깅줉??媛쒖씤吏???뺣낫瑜???젣?쒕떎.
	 * 
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoNm
	 */
	@PostMapping(value = "/dam/per/EgovComDamPersonalRemove.do")
	public String deleteKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		knoPersonalService.deleteKnoPersonal(knoPersonal);
		return "forward:/dam/per/EgovComDamPersonalList.do";
	}

}