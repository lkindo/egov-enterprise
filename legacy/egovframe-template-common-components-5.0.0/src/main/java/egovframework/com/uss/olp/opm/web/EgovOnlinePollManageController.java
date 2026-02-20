package egovframework.com.uss.olp.opm.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.opm.service.EgovOnlinePollManageService;
import egovframework.com.uss.olp.opm.service.OnlinePollItem;
import egovframework.com.uss.olp.opm.service.OnlinePollManage;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?⑤씪?퇠OLL愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
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
 *   2024.10.29  沅뚰깭??         ?깅줉 ?붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━
 *   2025.08.23  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovOnlinePollManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovOnlinePollManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "egovOnlinePollManageService")
	private EgovOnlinePollManageService egovOnlinePollManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** Egov Common Code Service */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?⑤씪?퇠OLL愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollManage
	 * @param model
	 * @return "egovframework/com/uss/olp/opm/EgovOnlinePollList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?⑤씪?퇼oll愿由?, order = 660, gid = 50)
	@RequestMapping(value = "/uss/olp/opm/listOnlinePollManage.do")
	public String egovOnlinePollManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollManage onlinePollManage, ModelMap model) throws Exception {

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

		List<EgovMap> reusltList = egovOnlinePollManageService.selectOnlinePollManageList(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovOnlinePollManageService.selectOnlinePollManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/opm/EgovOnlinePollManageList";
	}

	/**
	 * ?⑤씪?퇠OLL愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlinePollVO
	 * @param commandMap
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/detailOnlinePollManage.do")
	public String egovOnlinePollManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			OnlinePollManage onlinePollManage, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/opm/EgovOnlinePollManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		// 寃뚯떆臾???젣
		if (sCmd.equals("del")) {
			egovOnlinePollManageService.deleteOnlinePollManage(onlinePollManage);
			sLocationUrl = "redirect:/uss/olp/opm/listOnlinePollManage.do";
		} else {
			model.addAttribute("onlinePollManage",
					egovOnlinePollManageService.selectOnlinePollManageDetail(onlinePollManage));
		}

		// POLL醫낅쪟 ?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("pollKindCodeList", listComCode);

		return sLocationUrl;
	}

	/**
	 * ?⑤씪?퇠OLL愿由??섏젙?붾㈃
	 * 
	 * @param searchVO
	 * @param onlinePollManage
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/updtOnlinePollManageView.do")
	public String egovOnlinePollManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			OnlinePollManage onlinePollManage, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 寃뚯떆臾??뺣낫 ?ㅼ젙
		OnlinePollManage onlinePollManageVO = egovOnlinePollManageService
				.selectOnlinePollManageDetail(onlinePollManage);
		model.addAttribute("onlinePollManage", onlinePollManageVO);

		// POLL醫낅쪟 Select諛뺤뒪 ?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("pollKindCodeList", listComCode);

		return "egovframework/com/uss/olp/opm/EgovOnlinePollManageUpdt";
	}

	/**
	 * ?⑤씪?퇠OLL愿由щ? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollManage
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/opm/listOnlinePollManage.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/updtOnlinePollManage.do")
	public String egovOnlinePollManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollManage onlinePollManage, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olp/opm/EgovOnlinePollManageUpdt";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		onlinePollManage.setFrstRegisterId(uniqId);
		onlinePollManage.setLastUpdusrId(uniqId);

		egovOnlinePollManageService.updateOnlinePollManage(onlinePollManage);

		return "redirect:/uss/olp/opm/listOnlinePollManage.do";
	}

	/**
	 * ?⑤씪?퇠OLL愿由??깅줉?붾㈃
	 * 
	 * @param searchVO
	 * @param onlinePollManage
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/registOnlinePollManageView.do")
	public String egovOnlinePollManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("onlinePollManage") OnlinePollManage onlinePollManage, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// POLL醫낅쪟 Select諛뺤뒪 ?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("pollKindCodeList", listComCode);

		return "egovframework/com/uss/olp/opm/EgovOnlinePollManageRegist";
	}

	/**
	 * ?⑤씪?퇠OLL愿由щ? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollManage
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/opm/listOnlinePollManage.do";
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/registOnlinePollManage.do")
	public String egovOnlinePollManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("onlinePollManage") OnlinePollManage onlinePollManage,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olp/opm/EgovOnlinePollManageRegist";
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		onlinePollManage.setFrstRegisterId(uniqId);
		onlinePollManage.setLastUpdusrId(uniqId);

		egovOnlinePollManageService.insertOnlinePollManage(onlinePollManage);

		return "redirect:/uss/olp/opm/listOnlinePollManage.do";
	}

	/**
	 * ?⑤씪?퇠OLL??ぉ?꾩“?뚰븳??
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollItem
	 * @param bindingResult
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/listOnlinePollItem.do")
	public String egovOnlinePollItemList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("onlinePollItem") OnlinePollItem onlinePollItem,
			ModelMap model) throws Exception {

		List<EgovMap> reusltList = egovOnlinePollManageService.selectOnlinePollItemList(onlinePollItem);
		model.addAttribute("resultList", reusltList);

		return "egovframework/com/uss/olp/opm/EgovOnlinePollItemList";
	}

	/**
	 * ?⑤씪?퇠OLL??ぉ???깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param olinePollItem
	 * @param bindingResult
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/registOnlinePollItem.do")
	public String egovOnlinePollItemRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollItem onlinePollItem, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		onlinePollItem.setFrstRegisterId(uniqId);
		onlinePollItem.setLastUpdusrId(uniqId);

		egovOnlinePollManageService.insertOnlinePollItem(onlinePollItem);

		return "forward:/uss/olp/opm/listOnlinePollItem.do";
	}

	/**
	 * ?⑤씪?퇠OLL??ぉ???섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param olinePollItem
	 * @param bindingResult
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/updtOnlinePollItem.do")
	public String egovOnlinePollItemModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollItem onlinePollItem, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		onlinePollItem.setFrstRegisterId(uniqId);
		onlinePollItem.setLastUpdusrId(uniqId);

		egovOnlinePollManageService.updateOnlinePollItem(onlinePollItem);

		return "forward:/uss/olp/opm/listOnlinePollItem.do";
	}

	/**
	 * ?⑤씪?퇠OLL??ぉ????젣?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param olinePollItem
	 * @param bindingResult
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opm/delOnlinePollItem.do")
	public String egovOnlinePollItemDelete(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollItem onlinePollItem, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		egovOnlinePollManageService.deleteOnlinePollItem(onlinePollItem);

		return "forward:/uss/olp/opm/listOnlinePollItem.do";
	}

}
