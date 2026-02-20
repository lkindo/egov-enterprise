package egovframework.com.dam.spe.req.web;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import egovframework.com.dam.map.mat.service.EgovMapMaterialService;
import egovframework.com.dam.map.mat.service.MapMaterial;
import egovframework.com.dam.map.mat.service.MapMaterialVO;
import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import egovframework.com.dam.spe.req.service.EgovRequestOfferService;
import egovframework.com.dam.spe.req.service.RequestOfferVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.08.30
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.30  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2025.06.18  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovRequestOfferController {

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

	/** egovRequestOffeService */
	@Resource(name = "egovRequestOffeService")
	private EgovRequestOfferService egovRequestOfferVOService;

	/** MapTeamService */
	@Resource(name = "MapTeamService")
	private EgovMapTeamService mapTeamService;

	@Resource(name = "MapMaterialService")
	public EgovMapMaterialService mapMaterialService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param requestOfferVO
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVOList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "吏?앹젙蹂댁젣怨?, listUrl = "/dam/spe/req/listRequestOffer.do", order = 1291, gid = 80)
	@RequestMapping(value = "/dam/spe/req/listRequestOffer.do")
	public String EgovRequestOfferList(@ModelAttribute("searchVO") RequestOfferVO searchVO,
			@RequestParam Map<?, ?> commandMap, RequestOfferVO requestOfferVO, ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

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

		List<EgovMap> resultList = egovRequestOfferVOService.selectRequestOfferList(searchVO);
		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovRequestOfferVOService.selectRequestOfferListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// (吏?앹쟾臾멸?/吏?앹궗?⑹옄) 寃??諛??ㅼ젙
		HashMap<String, String> hmParam = new HashMap<String, String>();
		hmParam.put("speId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		// 吏?앹쟾臾멸? ?쇰븣
		if (egovRequestOfferVOService.selectRequestOfferSpeCheck(hmParam)) {
			model.addAttribute("IS_SPE", "Y");
		} else {
			model.addAttribute("IS_SPE", "N");
			model.addAttribute("USER_UNIQ_ID",
					loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		}

		return "egovframework/com/dam/spe/req/EgovComDamRequestOfferList";

	}

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param RequestOfferVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVODetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/spe/req/detailRequestOffer.do")
	public String EgovRequestOfferDetail(@ModelAttribute("searchVO") RequestOfferVO searchVO,
			RequestOfferVO requestOfferVO, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/dam/spe/req/EgovComDamRequestOfferDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {

			HashMap<String, String> hmParam = new HashMap<String, String>();
			hmParam.put("ansParents", requestOfferVO.getKnoId());

			// ?섏쐞?듬? 寃??嫄댁닔瑜?泥댄겕
			if (egovRequestOfferVOService.selectRequestOfferDelCnt(hmParam) > 0) {
				// ?먮윭 硫붿꽭吏 異쒕젰
				String reusltScript = "";

				reusltScript += "<script type='text/javaScript' language='javascript'>";
				reusltScript += "alert(' ?섏쐞 ?듬????깅줉?섏뼱 ?덉뼱 ??젣?좎닔 ?놁뒿?덈떎!  ');";
				reusltScript += "</script>";

				model.addAttribute("reusltScript", reusltScript);

				sCmd = "delMsg";
			} else {
				egovRequestOfferVOService.deleteRequestOffer(requestOfferVO);
				sLocationUrl = "forward:/dam/spe/req/listRequestOffer.do";
			}
		}

		if (!sCmd.equals("del")) {
			// ?곸꽭?뺣낫 遺덈윭?ㅺ린
			RequestOfferVO requestOfferVOs = egovRequestOfferVOService.selectRequestOfferDetail(requestOfferVO);
			model.addAttribute("requestOfferVO", requestOfferVOs);

			// 議곗쭅?좏삎 遺덈윭?ㅺ린
			MapTeamVO mapTeamVO = new MapTeamVO();
			mapTeamVO.setRecordCountPerPage(999999);
			mapTeamVO.setFirstIndex(0);
			mapTeamVO.setSearchCondition("MaterialList");
			List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(mapTeamVO);
			model.addAttribute("mapTeamList", mapTeamList);

			// 吏?앹쑀?뺤퐫?쒕텋?ъ삤湲?
			MapMaterialVO searchMatVO = new MapMaterialVO();
			searchMatVO.setRecordCountPerPage(999999);
			searchMatVO.setFirstIndex(0);
			searchMatVO.setSearchCondition("orgnztId");
			searchMatVO.setSearchKeyword(requestOfferVOs.getOrgnztId());
			List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(searchMatVO);
			model.addAttribute("mapMaterialList", mapMaterialList);

			// (吏?앹쟾臾멸?/吏?앹궗?⑹옄) 寃??諛??ㅼ젙
			HashMap<String, String> hmParam = new HashMap<String, String>();
			hmParam.put("speId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// ?꾩씠???ㅼ젙
			model.addAttribute("USER_UNIQ_ID",
					loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			// 吏?앹쟾臾멸? ?쇰븣
			if (egovRequestOfferVOService.selectRequestOfferSpeCheck(hmParam)) {
				model.addAttribute("IS_SPE", "Y");
			} else {
				model.addAttribute("IS_SPE", "N");
			}

		}

		return sLocationUrl;

	}

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? ?섏젙 議고쉶 ?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param RequestOfferVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVORegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/spe/req/updtRequestOffer.do")
	public String EgovRequestOfferModify(@ModelAttribute("searchVO") RequestOfferVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("requestOfferVO") RequestOfferVO requestOfferVO,
			MapMaterial mapMaterial, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		RequestOfferVO requestOfferVOs = new RequestOfferVO();

		if (!sCmd.equals("change")) {
			// ?섏젙?뺣낫 遺덈윭?ㅺ린
			requestOfferVOs = egovRequestOfferVOService.selectRequestOfferDetail(requestOfferVO);
			model.addAttribute("requestOfferVO", requestOfferVOs);
		}

		// 議곗쭅?좏삎 遺덈윭?ㅺ린
		MapTeamVO mapTeamVO = new MapTeamVO();
		mapTeamVO.setRecordCountPerPage(999999);
		mapTeamVO.setFirstIndex(0);
		mapTeamVO.setSearchCondition("MaterialList");
		List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(mapTeamVO);
		model.addAttribute("mapTeamList", mapTeamList);

		// 吏?앹쑀?뺤퐫?쒕텋?ъ삤湲?
		MapMaterialVO searchMatVO = new MapMaterialVO();
		searchMatVO.setRecordCountPerPage(999999);
		searchMatVO.setFirstIndex(0);
		searchMatVO.setSearchCondition("orgnztId");
		if (sCmd.equals("change")) {
			searchMatVO.setSearchKeyword(requestOfferVO.getOrgnztId());
		} else {
			searchMatVO.setSearchKeyword(requestOfferVOs.getOrgnztId());
		}

		List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(searchMatVO);
		model.addAttribute("mapMaterialList", mapMaterialList);

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/dam/spe/req/EgovComDamRequestOfferUpdt";
	}

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param requestOfferVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVOUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/spe/req/updtRequestOfferActor.do")
	public String EgovRequestOfferModifyActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") RequestOfferVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("RequestOfferVO") RequestOfferVO requestOfferVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

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

		String sLocationUrl = "egovframework/com/dam/spe/req/EgovComDamRequestOfferUpdt";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("save")) {

			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}
			// ?꾩씠???ㅼ젙
			requestOfferVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			requestOfferVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
			String atchFileId = requestOfferVO.getAtchFileId();

			// final Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = commandMap.get("atchFileAt") == null ? "" : (String) commandMap.get("atchFileAt");
				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					requestOfferVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}
			// ???
			egovRequestOfferVOService.updateRequestOffer(requestOfferVO);
			sLocationUrl = "forward:/dam/spe/req/listRequestOffer.do";
		} else {

			// ?섏젙?뺣낫 遺덈윭?ㅺ린
			RequestOfferVO resultRequestOfferVO = egovRequestOfferVOService.selectRequestOfferDetail(requestOfferVO);
			model.addAttribute("requestOfferVO", resultRequestOfferVO);
		}

		return sLocationUrl;
	}

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? ?깅줉 議고쉶 ?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param RequestOfferVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVORegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/spe/req/registRequestOffer.do")
	public String EgovRequestOfferRegist(
			// @ModelAttribute("searchVO") RequestOfferVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("requestOfferVO") RequestOfferVO requestOfferVO,
			@ModelAttribute("mapMaterial") MapMaterial mapMaterial, ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		MapTeamVO mapTeamVO = new MapTeamVO();
		mapTeamVO.setRecordCountPerPage(999999);
		mapTeamVO.setFirstIndex(0);
		mapTeamVO.setSearchCondition("MaterialList");
		List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(mapTeamVO);
		model.addAttribute("mapTeamList", mapTeamList);

		MapMaterialVO searchMatVO = new MapMaterialVO();
		searchMatVO.setRecordCountPerPage(999999);
		searchMatVO.setFirstIndex(0);
		searchMatVO.setSearchCondition("orgnztId");
		searchMatVO.setSearchKeyword(requestOfferVO.getOrgnztId());

		// if (mapMaterial.getOrgnztId().equals("")) {
		// EgovMap emp = (EgovMap)MapTeamList.get(0);
		// mapMaterial.setOrgnztId(emp.get("orgnztId").toString());
		// }

		List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(searchMatVO);
		model.addAttribute("mapMaterialList", mapMaterialList);

		model.addAttribute("cmd", sCmd);

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/dam/spe/req/EgovComDamRequestOfferRegist";
	}

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? ?깅줉??泥섎━ ?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param RequestOfferVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/dam/spe/req/EgovRequestOfferVORegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/spe/req/registRequestOfferActor.do")
	public String EgovRequestOfferRegistActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") RequestOfferVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("requestOfferVO") RequestOfferVO requestOfferVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

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

		String sLocationUrl = "egovframework/com/dam/spe/req/EgovComDamRequestOfferRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("save") || sCmd.equals("reply")) {
			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}

			// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
			String atchFileId = "";

			// final Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.

				// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
				requestOfferVO.setAtchFileId(atchFileId);
			}

			// ?꾩씠???ㅼ젙
			requestOfferVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			requestOfferVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// (吏?앹쟾臾멸?/吏?앹궗?⑹옄) 寃??諛??ㅼ젙
			HashMap<String, String> hmParam = new HashMap<String, String>();
			hmParam.put("speId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// 吏?앹쟾臾멸? ?쇰븣
			if (sCmd.equals("reply") && egovRequestOfferVOService.selectRequestOfferSpeCheck(hmParam)) {
				requestOfferVO.setSpeId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
				// 吏?앹쟾臾멸? ?꾨땲怨?reply ?쇰븣
			} else if (sCmd.equals("reply")) {
				return "egovframework/com/dam/spe/req/EgovComDamRequestOfferRegist";
				// ?쇰컲?ъ슜?먯씪??
			} else {
				requestOfferVO.setEmplyrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			}

			// ???
			egovRequestOfferVOService.insertRequestOffer(requestOfferVO);

			sLocationUrl = "forward:/dam/spe/req/listRequestOffer.do";
		}

		return sLocationUrl;
	}

}
