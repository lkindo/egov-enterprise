package egovframework.com.uss.ion.ulm.web;

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
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ulm.service.EgovUnityLinkService;
import egovframework.com.uss.ion.ulm.service.UnityLink;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?듯빀留곹겕愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2024.10.29  沅뚰깭??         ?깅줉 ?붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━, validation ?곸슜
 *   2025.08.18  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovUnityLinkController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovUnityLinkController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "egovUnityLinkService")
	private EgovUnityLinkService egovUnityLinkService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** Egov Common Code Service */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?듯빀留곹겕愿由?硫붿씤 ?덊뵆 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param unityLinkVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ulm/UnityLinkSample"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/listUnityLinkSample.do")
	public String egovUnityLinkSample1List(UnityLink unityLinkVO, ModelMap model) throws Exception {
		if (LOGGER.isDebugEnabled()) {
			LOGGER.debug("unityLinkVO={}", unityLinkVO);
		}

		List<?> reusltList = egovUnityLinkService.selectUnityLinkSample(unityLinkVO);
		model.addAttribute("resultList", reusltList);

		return "egovframework/com/uss/ion/ulm/UnityLinkSample";
	}

	/**
	 * ?듯빀留곹겕愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param unityLinkVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ulm/EgovOnlinePollList"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@IncludedInfo(name = "?듯빀留곹겕愿由?, order = 780, gid = 50)
	@RequestMapping(value = "/uss/ion/ulm/listUnityLink.do")
	public String egovUnityLinkList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, UnityLink unityLinkVO, ModelMap model) throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

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

		List<?> reusltList = egovUnityLinkService.selectUnityLinkList(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovUnityLinkService.selectUnityLinkListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// ?듯빀留곹겕援щ텇?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<?> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("unityLinkSeCodeList", listComCode);

		return "egovframework/com/uss/ion/ulm/EgovUnityLinkList";
	}

	/**
	 * ?듯빀留곹겕愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param unityLinkVO
	 * @param commandMap
	 * @param model
	 * @return "/uss/ion/ulm/EgovOnlinePollDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/detailUnityLink.do")
	public String egovUnityLinkDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO, UnityLink unityLink,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/ulm/EgovUnityLinkDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovUnityLinkService.deleteUnityLink(unityLink);
			sLocationUrl = "forward:/uss/ion/ulm/listUnityLink.do";
		} else {
			// ?듯빀留곹겕援щ텇?ㅼ젙
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM039");
			List<?> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("unityLinkSeCodeList", listComCode);
			// ?곸꽭?뺣낫 遺덈윭?ㅺ린
			UnityLink unityLinkVO = egovUnityLinkService.selectUnityLinkDetail(unityLink);
			model.addAttribute("unityLink", unityLinkVO);
		}

		return sLocationUrl;
	}

	/**
	 * ?듯빀留곹겕愿由??섏젙?붾㈃
	 * 
	 * @param searchVO
	 * @param unityLinkVO
	 * @param model
	 * @return "/uss/ion/ulm/EgovOnlinePollUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/updtUnityLinkView.do")
	public String egovUnityLinkModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("unityLink") UnityLink unityLink, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?듯빀留곹겕援щ텇?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<?> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("unityLinkSeCodeList", listComCode);
		// ?섏젙?뺣낫 遺덈윭?ㅺ린
		UnityLink unityLinkVO = egovUnityLinkService.selectUnityLinkDetail(unityLink);
		model.addAttribute("unityLink", unityLinkVO);

		return "egovframework/com/uss/ion/ulm/EgovUnityLinkUpdt";
	}

	/**
	 * ?듯빀留곹겕愿由щ? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param unityLinkVO
	 * @param bindingResult
	 * @param model
	 * @return "/uss/ion/ulm/EgovOnlinePollUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/updtUnityLink.do")
	public String egovUnityLinkModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("unityLink") UnityLink unityLink, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/ulm/EgovUnityLinkUpdt";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		unityLink.setFrstRegisterId(uniqId);
		unityLink.setLastUpdusrId(uniqId);

		// ???
		egovUnityLinkService.updateUnityLink(unityLink);

		return "redirect:/uss/ion/ulm/listUnityLink.do";
	}

	/**
	 * ?듯빀留곹겕愿由??깅줉 ?붾㈃
	 * 
	 * @param searchVO
	 * @param unityLinkVO
	 * @param model
	 * @return "/uss/ion/ulm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/registUnityLinkView.do")
	public String egovUnityLinkRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("unityLink") UnityLink unityLink, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?듯빀留곹겕援щ텇?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<?> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("unityLinkSeCodeList", listComCode);

		return "egovframework/com/uss/ion/ulm/EgovUnityLinkRegist";
	}

	/**
	 * ?듯빀留곹겕愿由щ? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param unityLink
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ulm/registUnityLink.do")
	public String egovUnityLinkRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("unityLink") UnityLink unityLink, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/ulm/EgovUnityLinkRegist";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		unityLink.setFrstRegisterId(uniqId);
		unityLink.setLastUpdusrId(uniqId);

		// ???
		egovUnityLinkService.insertUnityLink(unityLink);

		return "redirect:/uss/ion/ulm/listUnityLink.do";
	}

}