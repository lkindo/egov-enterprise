package egovframework.com.ssi.syi.sim.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.ssi.syi.iis.service.CntcInsttVO;
import egovframework.com.ssi.syi.iis.service.CntcServiceVO;
import egovframework.com.ssi.syi.iis.service.CntcSystemVO;
import egovframework.com.ssi.syi.iis.service.EgovCntcInsttService;
import egovframework.com.ssi.syi.sim.service.EgovSystemCntcService;
import egovframework.com.ssi.syi.sim.service.SystemCntc;
import egovframework.com.ssi.syi.sim.service.SystemCntcVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?쒖뒪?쒖뿰怨?愿由ъ뿉 愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳
 * Controller瑜??뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.07.01  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovSystemCntcController {

	@Resource(name = "SystemCntcService")
	private EgovSystemCntcService systemCntcService;

	@Resource(name = "CntcInsttService")
	private EgovCntcInsttService cntcInsttService;

	/** EgovIdGnrService */
	@Resource(name = "egovSystemCntcIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ??젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "forward:/ssi/syi/sim/EgovCcmAdministCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/removeSystemCntc.do")
	public String deleteSystemCntc(SystemCntc systemCntc, ModelMap model) throws Exception {
		systemCntcService.deleteSystemCntc(systemCntc);
		return "forward:/ssi/syi/sim/getSystemCntcList.do";
	}

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?깅줉?쒕떎.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmSystemCntcRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/addSystemCntc.do")
	public String insertSystemCntc(@Valid @ModelAttribute("systemCntc") SystemCntc systemCntc, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ?곌퀎湲곌? 由ъ뒪?몃컯???곗씠??
			CntcInsttVO searchCntcInsttVO;
			searchCntcInsttVO = new CntcInsttVO();
			searchCntcInsttVO.setRecordCountPerPage(999999);
			searchCntcInsttVO.setFirstIndex(0);
			searchCntcInsttVO.setSearchCondition("CodeList");
			List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
			model.addAttribute("cntcInsttList", cntcInsttList);

			// ?곌퀎?쒖뒪??由ъ뒪?몃컯???곗씠??
			CntcSystemVO searchCntcSystemVO;
			searchCntcSystemVO = new CntcSystemVO();
			searchCntcSystemVO.setRecordCountPerPage(999999);
			searchCntcSystemVO.setFirstIndex(0);
			searchCntcSystemVO.setSearchCondition("CodeList");
			if (systemCntc.getProvdInsttId().equals("")) {
				if (cntcInsttList.size() > 0) {
					EgovMap emp = cntcInsttList.get(0);
					systemCntc.setProvdInsttId(emp.get("insttId").toString());
				}
			}
			searchCntcSystemVO.setInsttId(systemCntc.getProvdInsttId());
			List<EgovMap> cntcProvdSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcProvdSystemList", cntcProvdSystemList);

			if (systemCntc.getRequstInsttId().equals("")) {
				if (cntcInsttList.size() > 0) {
					EgovMap emp = cntcInsttList.get(0);
					systemCntc.setRequstInsttId(emp.get("insttId").toString());
				}
			}
			searchCntcSystemVO.setInsttId(systemCntc.getRequstInsttId());
			List<EgovMap> cntcRequstSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcRequstSystemList", cntcRequstSystemList);

			// ?곌퀎?쒕퉬??由ъ뒪?몃컯???곗씠??
			CntcServiceVO searchCntcServiceVO;
			searchCntcServiceVO = new CntcServiceVO();
			searchCntcServiceVO.setRecordCountPerPage(999999);
			searchCntcServiceVO.setFirstIndex(0);
			searchCntcServiceVO.setSearchCondition("CodeList");
			searchCntcServiceVO.setInsttId(systemCntc.getProvdInsttId());
			if (systemCntc.getProvdSysId().equals("")) {
				if (cntcProvdSystemList.size() > 0) {
					EgovMap emp = cntcProvdSystemList.get(0);
					systemCntc.setProvdSysId(emp.get("sysId").toString());
				}
			}
			searchCntcServiceVO.setSysId(systemCntc.getProvdSysId());
			List<EgovMap> cntcProvdServiceList = cntcInsttService.selectCntcServiceList(searchCntcServiceVO);
			model.addAttribute("cntcProvdServiceList", cntcProvdServiceList);

			return "egovframework/com/ssi/syi/sim/EgovSystemCntcRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {

				return "egovframework/com/ssi/syi/sim/EgovSystemCntcRegist";
			}

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			systemCntc.setFrstRegisterId(uniqId);

			// ID Generation
			String sCntcId = idgenService.getNextStringId();
			systemCntc.setCntcId(sCntcId);

			systemCntcService.insertSystemCntc(systemCntc);
			return "forward:/ssi/syi/sim/getSystemCntcList.do";
		} else {
			return "forward:/ssi/syi/sim/getSystemCntcList.do";
		}
	}

	/**
	 * ?쒖뒪?쒖뿰怨??곸꽭?댁뿭??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmSystemCntcDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/getSystemCntcDetail.do")
	public String selectSystemCntcDetail(SystemCntc systemCntc, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/sim/getSystemCntcDetail.do";
		model.addAttribute("selfUri", selfUri);

		SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
		model.addAttribute("result", vo);

		// ?곌퀎湲곌? 由ъ뒪?몃컯???곗씠??
		CntcInsttVO searchCntcInsttVO;
		searchCntcInsttVO = new CntcInsttVO();
		searchCntcInsttVO.setRecordCountPerPage(999999);
		searchCntcInsttVO.setFirstIndex(0);
		searchCntcInsttVO.setSearchCondition("CodeList");
		List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
		model.addAttribute("cntcInsttList", cntcInsttList);

		// ?곌퀎?쒖뒪??由ъ뒪?몃컯???곗씠??
		CntcSystemVO searchCntcSystemVO;
		searchCntcSystemVO = new CntcSystemVO();
		searchCntcSystemVO.setRecordCountPerPage(999999);
		searchCntcSystemVO.setFirstIndex(0);
		searchCntcSystemVO.setSearchCondition("CodeList");
		searchCntcSystemVO.setInsttId(vo.getProvdInsttId());
		List<EgovMap> cntcProvdSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
		model.addAttribute("cntcProvdSystemList", cntcProvdSystemList);

		searchCntcSystemVO.setInsttId(vo.getRequstInsttId());
		List<EgovMap> cntcRequstSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
		model.addAttribute("cntcRequstSystemList", cntcRequstSystemList);

		// ?곌퀎?쒕퉬??由ъ뒪?몃컯???곗씠??
		CntcServiceVO searchCntcServiceVO;
		searchCntcServiceVO = new CntcServiceVO();
		searchCntcServiceVO.setRecordCountPerPage(999999);
		searchCntcServiceVO.setFirstIndex(0);
		searchCntcServiceVO.setSearchCondition("CodeList");
		searchCntcServiceVO.setInsttId(vo.getProvdInsttId());
		searchCntcServiceVO.setSysId(vo.getProvdSysId());
		List<EgovMap> cntcProvdServiceList = cntcInsttService.selectCntcServiceList(searchCntcServiceVO);
		model.addAttribute("cntcProvdServiceList", cntcProvdServiceList);

		return "egovframework/com/ssi/syi/sim/EgovSystemCntcDetail";
	}

	/**
	 * ?쒖뒪?쒖뿰怨?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmSystemCntcList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?쒖뒪?쒖뿰怨꾧?由?, listUrl = "/ssi/syi/sim/getSystemCntcList.do", order = 1210, gid = 70)
	@RequestMapping(value = "/ssi/syi/sim/getSystemCntcList.do")
	public String selectSystemCntcList(@ModelAttribute("searchVO") SystemCntcVO searchVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/sim/getSystemCntcList.do";
		model.addAttribute("selfUri", selfUri);

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

		List<EgovMap> resultList = systemCntcService.selectSystemCntcList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = systemCntcService.selectSystemCntcListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/sim/EgovSystemCntcList";
	}

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?섏젙?쒕떎.
	 * 
	 * @param loginVO
	 * @param integInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmAdministCodeModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/updateSystemCntc.do")
	public String updateSystemCntc(@Valid @ModelAttribute("systemCntc") SystemCntc systemCntc, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			if (systemCntc.getCntcNm().equals("")) {
				SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
				model.addAttribute("systemCntc", vo);
				systemCntc.setProvdInsttId(vo.getProvdInsttId());
				systemCntc.setRequstInsttId(vo.getRequstInsttId());
				systemCntc.setProvdSysId(vo.getProvdSysId());
			}
			// ?곌퀎湲곌? 由ъ뒪?몃컯???곗씠??
			CntcInsttVO searchCntcInsttVO;
			searchCntcInsttVO = new CntcInsttVO();
			searchCntcInsttVO.setRecordCountPerPage(999999);
			searchCntcInsttVO.setFirstIndex(0);
			searchCntcInsttVO.setSearchCondition("CodeList");
			List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
			model.addAttribute("cntcInsttList", cntcInsttList);

			// ?곌퀎?쒖뒪??由ъ뒪?몃컯???곗씠??
			CntcSystemVO searchCntcSystemVO;
			searchCntcSystemVO = new CntcSystemVO();
			searchCntcSystemVO.setRecordCountPerPage(999999);
			searchCntcSystemVO.setFirstIndex(0);
			searchCntcSystemVO.setSearchCondition("CodeList");
			searchCntcSystemVO.setInsttId(systemCntc.getProvdInsttId());
			List<EgovMap> cntcProvdSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcProvdSystemList", cntcProvdSystemList);

			searchCntcSystemVO.setInsttId(systemCntc.getRequstInsttId());
			List<EgovMap> cntcRequstSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcRequstSystemList", cntcRequstSystemList);

			// ?곌퀎?쒕퉬??由ъ뒪?몃컯???곗씠??
			CntcServiceVO searchCntcServiceVO;
			searchCntcServiceVO = new CntcServiceVO();
			searchCntcServiceVO.setRecordCountPerPage(999999);
			searchCntcServiceVO.setFirstIndex(0);
			searchCntcServiceVO.setSearchCondition("CodeList");
			searchCntcServiceVO.setInsttId(systemCntc.getProvdInsttId());
			searchCntcServiceVO.setSysId(systemCntc.getProvdSysId());
			List<EgovMap> cntcProvdServiceList = cntcInsttService.selectCntcServiceList(searchCntcServiceVO);
			model.addAttribute("cntcProvdServiceList", cntcProvdServiceList);

			return "egovframework/com/ssi/syi/sim/EgovSystemCntcUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				if (systemCntc.getCntcNm().equals("")) {
					SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
					model.addAttribute("systemCntc", vo);
					systemCntc.setProvdInsttId(vo.getProvdInsttId());
					systemCntc.setRequstInsttId(vo.getRequstInsttId());
					systemCntc.setProvdSysId(vo.getProvdSysId());
				}
				// ?곌퀎湲곌? 由ъ뒪?몃컯???곗씠??
				CntcInsttVO searchCntcInsttVO;
				searchCntcInsttVO = new CntcInsttVO();
				searchCntcInsttVO.setRecordCountPerPage(999999);
				searchCntcInsttVO.setFirstIndex(0);
				searchCntcInsttVO.setSearchCondition("CodeList");
				List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
				model.addAttribute("cntcInsttList", cntcInsttList);

				// ?곌퀎?쒖뒪??由ъ뒪?몃컯???곗씠??
				CntcSystemVO searchCntcSystemVO;
				searchCntcSystemVO = new CntcSystemVO();
				searchCntcSystemVO.setRecordCountPerPage(999999);
				searchCntcSystemVO.setFirstIndex(0);
				searchCntcSystemVO.setSearchCondition("CodeList");
				searchCntcSystemVO.setInsttId(systemCntc.getProvdInsttId());
				List<EgovMap> cntcProvdSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
				model.addAttribute("cntcProvdSystemList", cntcProvdSystemList);

				searchCntcSystemVO.setInsttId(systemCntc.getRequstInsttId());
				List<EgovMap> cntcRequstSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
				model.addAttribute("cntcRequstSystemList", cntcRequstSystemList);

				// ?곌퀎?쒕퉬??由ъ뒪?몃컯???곗씠??
				CntcServiceVO searchCntcServiceVO;
				searchCntcServiceVO = new CntcServiceVO();
				searchCntcServiceVO.setRecordCountPerPage(999999);
				searchCntcServiceVO.setFirstIndex(0);
				searchCntcServiceVO.setSearchCondition("CodeList");
				searchCntcServiceVO.setInsttId(systemCntc.getProvdInsttId());
				searchCntcServiceVO.setSysId(systemCntc.getProvdSysId());
				List<EgovMap> cntcProvdServiceList = cntcInsttService.selectCntcServiceList(searchCntcServiceVO);
				model.addAttribute("cntcProvdServiceList", cntcProvdServiceList);

				return "egovframework/com/ssi/syi/sim/EgovSystemCntcUpdt";
			}

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			systemCntc.setLastUpdusrId(uniqId);
			systemCntcService.updateSystemCntc(systemCntc);
			return "forward:/ssi/syi/sim/getSystemCntcList.do";
		} else {
			return "forward:/ssi/syi/sim/getSystemCntcList.do";
		}
	}

	/**
	 * ?쒖뒪?쒖뿰怨??뱀씤 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param integInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmAdministCodeModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/scm/getConfirmSystemCntcList.do")
	// @RequestMapping(value="/ssi/syi/sim/getSystemCntcList.do")
	public String selectConfirmSystemCntcList(@ModelAttribute("searchVO") SystemCntcVO searchVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/scm/getConfirmSystemCntcList.do";
		model.addAttribute("selfUri", selfUri);

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

		List<EgovMap> resultList = systemCntcService.selectSystemCntcList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = systemCntcService.selectSystemCntcListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/sim/EgovSystemCntcList";
	}

	/**
	 * ?쒖뒪?쒖뿰怨??뱀씤 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "egovframework/com/ssi/syi/sim/EgovCcmSystemCntcDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/scm/getConfirmSystemCntcDetail.do")
	// @RequestMapping(value="/ssi/syi/sim/getSystemCntcDetail.do")
	public String selectConfirmSystemCntcDetail(SystemCntc systemCntc, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("Confirm")) {

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			systemCntc.setLastUpdusrId(uniqId);
			systemCntcService.confirmSystemCntc(systemCntc);
		}

		String selfUri = "/ssi/syi/scm/getConfirmSystemCntcDetail.do";
		model.addAttribute("selfUri", selfUri);

		SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
		model.addAttribute("result", vo);

		// ?곌퀎湲곌? 由ъ뒪?몃컯???곗씠??
		CntcInsttVO searchCntcInsttVO;
		searchCntcInsttVO = new CntcInsttVO();
		searchCntcInsttVO.setRecordCountPerPage(999999);
		searchCntcInsttVO.setFirstIndex(0);
		searchCntcInsttVO.setSearchCondition("CodeList");
		List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
		model.addAttribute("cntcInsttList", cntcInsttList);

		// ?곌퀎?쒖뒪??由ъ뒪?몃컯???곗씠??
		CntcSystemVO searchCntcSystemVO;
		searchCntcSystemVO = new CntcSystemVO();
		searchCntcSystemVO.setRecordCountPerPage(999999);
		searchCntcSystemVO.setFirstIndex(0);
		searchCntcSystemVO.setSearchCondition("CodeList");
		searchCntcSystemVO.setInsttId(vo.getProvdInsttId());
		List<EgovMap> cntcProvdSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
		model.addAttribute("cntcProvdSystemList", cntcProvdSystemList);

		searchCntcSystemVO.setInsttId(vo.getRequstInsttId());
		List<EgovMap> cntcRequstSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
		model.addAttribute("cntcRequstSystemList", cntcRequstSystemList);

		// ?곌퀎?쒕퉬??由ъ뒪?몃컯???곗씠??
		CntcServiceVO searchCntcServiceVO;
		searchCntcServiceVO = new CntcServiceVO();
		searchCntcServiceVO.setRecordCountPerPage(999999);
		searchCntcServiceVO.setFirstIndex(0);
		searchCntcServiceVO.setSearchCondition("CodeList");
		searchCntcServiceVO.setInsttId(vo.getProvdInsttId());
		searchCntcServiceVO.setSysId(vo.getProvdSysId());
		List<EgovMap> cntcProvdServiceList = cntcInsttService.selectCntcServiceList(searchCntcServiceVO);
		model.addAttribute("cntcProvdServiceList", cntcProvdServiceList);

		return "egovframework/com/ssi/syi/sim/EgovSystemCntcDetail";
	}

	/**
	 * Map ?댁슜???뺤씤?쒕떎.
	 * 
	 * @param commandMap
	 * @return
	 */
	public String printParameterMap(@RequestParam Map<?, ?> commandMap) {
		String ret = "";
		for (Object key : commandMap.keySet()) {
			Object value = commandMap.get(key);

			ret += "key:" + key.toString() + " value:" + value.toString();
		}
		return ret;
	}

}
