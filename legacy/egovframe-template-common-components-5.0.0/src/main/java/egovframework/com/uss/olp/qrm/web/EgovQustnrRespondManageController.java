package egovframework.com.uss.olp.qrm.web;

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
import egovframework.com.uss.olp.qrm.service.EgovQustnrRespondManageService;
import egovframework.com.uss.olp.qrm.service.QustnrRespondManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?ㅻЦ?묐떟?먭?由?Controller Class 援ы쁽
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
 *   2024.10.29  沅뚰깭??         ?깅줉 /?섏젙 ?붾㈃怨?泥섎━ 濡쒖쭅 遺꾨━
 *   2025.08.26  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovQustnrRespondManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQustnrRespondManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovQustnrRespondManageService")
	private EgovQustnrRespondManageService egovQustnrRespondManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?묐떟?먯젙蹂?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrRespondManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?묐떟?먭?由?, order = 620, gid = 50)
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageList.do")
	public String egovQustnrRespondManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, QustnrRespondManageVO qustnrRespondManageVO, ModelMap model)
			throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

		// ?ㅻЦ吏?뺣낫?먯꽌 ?섏뼱?ㅻ㈃ ?먮룞寃???ㅼ젙
		if (sSearchMode.equals("Y")) {
			searchVO.setSearchCondition("QESTNR_ID");
			searchVO.setSearchKeyword(qustnrRespondManageVO.getQestnrId());
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

		List<EgovMap> sampleList = egovQustnrRespondManageService.selectQustnrRespondManageList(searchVO);
		model.addAttribute("resultList", sampleList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovQustnrRespondManageService.selectQustnrRespondManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageList";
	}

	/**
	 * ?묐떟?먯젙蹂?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param qustnrRespondManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageDetail.do")
	public String egovQustnrRespondManageDetail(@ModelAttribute QustnrRespondManageVO qustnrRespondManageVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovQustnrRespondManageService.deleteQustnrRespondManage(qustnrRespondManageVO);
			sLocationUrl = "redirect:/uss/olp/qrm/EgovQustnrRespondManageList.do";
		} else {
			// ?깅퀎肄붾뱶議고쉶
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM014");
			List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("comCode014", listComCode);

			// 吏곸뾽肄붾뱶議고쉶
			voComCode.setCodeId("COM034");
			listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("comCode034", listComCode);

			List<EgovMap> resultList = egovQustnrRespondManageService
					.selectQustnrRespondManageDetail(qustnrRespondManageVO);
			model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * ?묐떟?먯젙蹂??섏젙?붾㈃
	 *
	 * @param searchVO
	 * @param qustnrRespondManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageModifyView.do")
	public String qustnrRespondManageModify(@ModelAttribute QustnrRespondManageVO qustnrRespondManageVO, ModelMap model)
			throws Exception {

		// ###
		LOGGER.debug("##### qustnrRespondManageModify vo >>> {}", qustnrRespondManageVO.getQestnrRespondId());

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?깅퀎肄붾뱶議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM014");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode014", listComCode);

		// 吏곸뾽肄붾뱶議고쉶
		voComCode.setCodeId("COM034");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		List<EgovMap> resultList = egovQustnrRespondManageService
				.selectQustnrRespondManageDetail(qustnrRespondManageVO);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageModify";
	}

	/**
	 * ?묐떟?먯젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrRespondManageVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/qrm/EgovQustnrRespondManageList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageModify.do")
	public String qustnrRespondManageModify(
			@ModelAttribute("qustnrRespondManageVO") QustnrRespondManageVO qustnrRespondManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?깅퀎肄붾뱶議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM014");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode014", listComCode);

		// 吏곸뾽肄붾뱶議고쉶
		voComCode.setCodeId("COM034");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageModify";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		qustnrRespondManageVO.setFrstRegisterId(uniqId);
		qustnrRespondManageVO.setLastUpdusrId(uniqId);

		egovQustnrRespondManageService.updateQustnrRespondManage(qustnrRespondManageVO);

		return "redirect:/uss/olp/qrm/EgovQustnrRespondManageList.do";
	}

	/**
	 * ?묐떟?먯젙蹂??깅줉?붾㈃
	 *
	 * @param searchVO
	 * @param qustnrRespondManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageRegistView.do")
	public String qustnrRespondManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("qustnrRespondManageVO") QustnrRespondManageVO qustnrRespondManageVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?깅퀎肄붾뱶議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM014");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode014", listComCode);

		// 吏곸뾽肄붾뱶議고쉶
		voComCode.setCodeId("COM034");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageRegist";
	}

	/**
	 * ?묐떟?먯젙蹂대? ?깅줉?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrRespondManageVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/olp/qrm/EgovQustnrRespondManageList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qrm/EgovQustnrRespondManageRegist.do")
	public String qustnrRespondManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("qustnrRespondManageVO") QustnrRespondManageVO qustnrRespondManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?깅퀎肄붾뱶議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM014");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode014", listComCode);

		// 吏곸뾽肄붾뱶議고쉶
		voComCode.setCodeId("COM034");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olp/qrm/EgovQustnrRespondManageRegist";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		qustnrRespondManageVO.setFrstRegisterId(uniqId);
		qustnrRespondManageVO.setLastUpdusrId(uniqId);

		egovQustnrRespondManageService.insertQustnrRespondManage(qustnrRespondManageVO);

		return "redirect:/uss/olp/qrm/EgovQustnrRespondManageList.do";
	}

}
