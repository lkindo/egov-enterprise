package egovframework.com.uss.olp.qmc.web;

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
import egovframework.com.uss.olp.qmc.service.EgovQustnrManageService;
import egovframework.com.uss.olp.qmc.service.QustnrManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * ?ㅻЦ愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2024.10.29  沅뚰깭??         ?깅줉 ?붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━
 *   2025.08.25  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovQustnrManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQustnrManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovQustnrManageService")
	private EgovQustnrManageService egovQustnrManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?ㅻЦ愿由??앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qmc/EgovQustnrManageListPopup"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageListPopup.do")
	public String egovQustnrManageListPopup(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, QustnrManageVO qustnrManageVO, ModelMap model) throws Exception {
		if (LOGGER.isDebugEnabled()) {
			LOGGER.debug("searchVO={}", searchVO);
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("del")) {
			egovQustnrManageService.deleteQustnrManage(qustnrManageVO);
		}

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

		List<EgovMap> sampleList = egovQustnrManageService.selectQustnrManageList(searchVO);
		model.addAttribute("resultList", sampleList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovQustnrManageService.selectQustnrManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qmc/EgovQustnrManageListPopup";
	}

	/**
	 * ?ㅻЦ愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrManageVO
	 * @param model
	 * @return "/uss/olp/qmc/EgovQustnrManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?ㅻЦ愿由?, order = 590, gid = 50)
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageList.do")
	public String egovQustnrManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, QustnrManageVO qustnrManageVO, ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("del")) {
			egovQustnrManageService.deleteQustnrManage(qustnrManageVO);
		}

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

		List<EgovMap> sampleList = egovQustnrManageService.selectQustnrManageList(searchVO);
		model.addAttribute("resultList", sampleList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovQustnrManageService.selectQustnrManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qmc/EgovQustnrManageList";
	}

	/**
	 * ?ㅻЦ愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param qustnrManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qmc/EgovQustnrManageDetail";
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageDetail.do")
	public String egovQustnrManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			QustnrManageVO qustnrManageVO, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qmc/EgovQustnrManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovQustnrManageService.deleteQustnrManage(qustnrManageVO);
			sLocationUrl = "redirect:/uss/olp/qmc/EgovQustnrManageList.do";
		} else {

			// 怨듯넻肄붾뱶 吏곸뾽?좏삎 議고쉶
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM034");
			List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("comCode034", listComCode);

			List<EgovMap> sampleList = egovQustnrManageService.selectQustnrManageDetail(qustnrManageVO);
			model.addAttribute("resultList", sampleList);
		}

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ愿由??섏젙?붾㈃
	 *
	 * @param searchVO
	 * @param qustnrManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qmc/EgovQustnrManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageModifyView.do")
	public String qustnrManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO, QustnrManageVO qustnrManageVO,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 怨듯넻肄붾뱶 吏곸뾽?좏삎 議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM034");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		List<EgovMap> resultList = egovQustnrManageService.selectQustnrManageDetail(qustnrManageVO);
		model.addAttribute("resultList", resultList);

		QustnrManageVO newQustnrManageVO = egovQustnrManageService.selectQustnrManageDetailModel(qustnrManageVO);
		model.addAttribute("qustnrManageVO", newQustnrManageVO);

		// ?ㅻЦ?쒗뵆由??뺣낫 遺덈윭?ㅺ린
		List<EgovMap> listQustnrTmplat = egovQustnrManageService.selectQustnrTmplatManageList(qustnrManageVO);
		model.addAttribute("listQustnrTmplat", listQustnrTmplat);

		return "egovframework/com/uss/olp/qmc/EgovQustnrManageModify";
	}

	/**
	 * ?ㅻЦ愿由щ? ?섏젙?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrManageVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/qmc/EgovQustnrManageList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageModify.do")
	public String qustnrManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, QustnrManageVO qustnrManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 怨듯넻肄붾뱶 吏곸뾽?좏삎 議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM034");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		if (bindingResult.hasErrors()) {

			List<EgovMap> sampleList = egovQustnrManageService.selectQustnrManageDetail(qustnrManageVO);
			model.addAttribute("resultList", sampleList);

			// ?ㅻЦ?쒗뵆由??뺣낫 遺덈윭?ㅺ린
			List<EgovMap> listQustnrTmplat = egovQustnrManageService.selectQustnrTmplatManageList(qustnrManageVO);
			model.addAttribute("listQustnrTmplat", listQustnrTmplat);

			return "egovframework/com/uss/olp/qmc/EgovQustnrManageModify";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		qustnrManageVO.setFrstRegisterId(uniqId);
		qustnrManageVO.setLastUpdusrId(uniqId);

		egovQustnrManageService.updateQustnrManage(qustnrManageVO);

		return "redirect:/uss/olp/qmc/EgovQustnrManageList.do";
	}

	/**
	 * ?ㅻЦ愿由??깅줉?붾㈃
	 *
	 * @param searchVO
	 * @param qustnrManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qmc/EgovQustnrManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageRegistView.do")
	public String qustnrManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("qustnrManageVO") QustnrManageVO qustnrManageVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 怨듯넻肄붾뱶 吏곸뾽?좏삎 議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM034");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		// ?ㅻЦ?쒗뵆由??뺣낫 遺덈윭?ㅺ린
		List<EgovMap> listQustnrTmplat = egovQustnrManageService.selectQustnrTmplatManageList(qustnrManageVO);
		model.addAttribute("listQustnrTmplat", listQustnrTmplat);

		return "egovframework/com/uss/olp/qmc/EgovQustnrManageRegist";
	}

	/**
	 * ?ㅻЦ愿由щ? ?깅줉?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrManageVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/qmc/EgovQustnrManageList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qmc/EgovQustnrManageRegist.do")
	public String qustnrManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("qustnrManageVO") QustnrManageVO qustnrManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 怨듯넻肄붾뱶 吏곸뾽?좏삎 議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM034");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		if (bindingResult.hasErrors()) {
			// ?ㅻЦ?쒗뵆由??뺣낫 遺덈윭?ㅺ린
			List<EgovMap> listQustnrTmplat = egovQustnrManageService.selectQustnrTmplatManageList(qustnrManageVO);
			model.addAttribute("listQustnrTmplat", listQustnrTmplat);
			return "egovframework/com/uss/olp/qmc/EgovQustnrManageRegist";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		qustnrManageVO.setFrstRegisterId(uniqId);
		qustnrManageVO.setLastUpdusrId(uniqId);

		egovQustnrManageService.insertQustnrManage(qustnrManageVO);

		return "redirect:/uss/olp/qmc/EgovQustnrManageList.do";
	}
}
