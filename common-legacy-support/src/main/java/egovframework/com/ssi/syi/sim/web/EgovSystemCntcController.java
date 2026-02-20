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
 * ???????? ???????????????? ??????????????? ?????????? ????
 * Controller?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.07.01  ????         ??????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovSystemCntcController {

	@Resource(name = "SystemCntcService")
	private EgovSystemCntcService systemCntcService;

	@Resource(name = "CntcInsttService")
	private EgovCntcInsttService cntcInsttService;

	/** EgovIdGnrService **/
	@Resource(name = "egovSystemCntcIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?????? ?????.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "forward: ssi/syi/sim/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/removeSystemCntc.do")
	public String deleteSystemCntc(SystemCntc systemCntc, ModelMap model) throws Exception {
		systemCntcService.deleteSystemCntc(systemCntc);
		return "forward:/ssi/syi/sim/getSystemCntcList.do";
	}

	/**
	 * ?????? ???.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmSystemCntcRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/addSystemCntc.do")
	public String insertSystemCntc(@Valid @ModelAttribute("systemCntc") SystemCntc systemCntc, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ?? ???????
			CntcInsttVO searchCntcInsttVO;
			searchCntcInsttVO = new CntcInsttVO();
			searchCntcInsttVO.setRecordCountPerPage(999999);
			searchCntcInsttVO.setFirstIndex(0);
			searchCntcInsttVO.setSearchCondition("CodeList");
			List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
			model.addAttribute("cntcInsttList", cntcInsttList);

			// ????????????
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

			// ????????????
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

			// ????? ?????? ??
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
	 * ??????????????.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmSystemCntcDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/sim/getSystemCntcDetail.do")
	public String selectSystemCntcDetail(SystemCntc systemCntc, ModelMap model) throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/sim/getSystemCntcDetail.do";
		model.addAttribute("selfUri", selfUri);

		SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
		model.addAttribute("result", vo);

		// ?? ???????
		CntcInsttVO searchCntcInsttVO;
		searchCntcInsttVO = new CntcInsttVO();
		searchCntcInsttVO.setRecordCountPerPage(999999);
		searchCntcInsttVO.setFirstIndex(0);
		searchCntcInsttVO.setSearchCondition("CodeList");
		List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
		model.addAttribute("cntcInsttList", cntcInsttList);

		// ????????????
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

		// ????????????
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
	 * ???????????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmSystemCntcList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/ssi/syi/sim/getSystemCntcList.do")
	public String selectSystemCntcList(@ModelAttribute("searchVO") SystemCntcVO searchVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/sim/getSystemCntcList.do";
		model.addAttribute("selfUri", selfUri);

		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
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
	 * ?????? ????.
	 * 
	 * @param loginVO
	 * @param integInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmAdministCodeModify"   
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
			// ?? ???????
			CntcInsttVO searchCntcInsttVO;
			searchCntcInsttVO = new CntcInsttVO();
			searchCntcInsttVO.setRecordCountPerPage(999999);
			searchCntcInsttVO.setFirstIndex(0);
			searchCntcInsttVO.setSearchCondition("CodeList");
			List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
			model.addAttribute("cntcInsttList", cntcInsttList);

			// ????????????
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

			// ????????????
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
				// ?? ???????
				CntcInsttVO searchCntcInsttVO;
				searchCntcInsttVO = new CntcInsttVO();
				searchCntcInsttVO.setRecordCountPerPage(999999);
				searchCntcInsttVO.setFirstIndex(0);
				searchCntcInsttVO.setSearchCondition("CodeList");
				List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
				model.addAttribute("cntcInsttList", cntcInsttList);

				// ????????????
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

				// ????????????
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

			// ????? ?????? ??
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
	 * ??????????????.
	 * 
	 * @param loginVO
	 * @param integInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmAdministCodeModify"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/scm/getConfirmSystemCntcList.do")
	// @RequestMapping(value="/ssi/syi/sim/getSystemCntcList.do")
	public String selectConfirmSystemCntcList(@ModelAttribute("searchVO") SystemCntcVO searchVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String selfUri = "/ssi/syi/scm/getConfirmSystemCntcList.do";
		model.addAttribute("selfUri", selfUri);

		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
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
	 * ?????????????????.
	 * 
	 * @param loginVO
	 * @param systemCntc
	 * @param model
	 * @return "egovframework com/ssi/syi/sim/EgovCcmSystemCntcDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/scm/getConfirmSystemCntcDetail.do")
	// @RequestMapping(value="/ssi/syi/sim/getSystemCntcDetail.do")
	public String selectConfirmSystemCntcDetail(SystemCntc systemCntc, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("Confirm")) {

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			systemCntc.setLastUpdusrId(uniqId);
			systemCntcService.confirmSystemCntc(systemCntc);
		}

		String selfUri = "/ssi/syi/scm/getConfirmSystemCntcDetail.do";
		model.addAttribute("selfUri", selfUri);

		SystemCntc vo = systemCntcService.selectSystemCntcDetail(systemCntc);
		model.addAttribute("result", vo);

		// ?? ???????
		CntcInsttVO searchCntcInsttVO;
		searchCntcInsttVO = new CntcInsttVO();
		searchCntcInsttVO.setRecordCountPerPage(999999);
		searchCntcInsttVO.setFirstIndex(0);
		searchCntcInsttVO.setSearchCondition("CodeList");
		List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
		model.addAttribute("cntcInsttList", cntcInsttList);

		// ????????????
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

		// ????????????
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
	 * Map ???????.
	 * 
	 * @param commandMap
	 * @return
	 **/
	public String printParameterMap(@RequestParam Map<?, ?> commandMap) {
		String ret = "";
		for (Object key : commandMap.keySet()) {
			Object value = commandMap.get(key);

			ret += "key:" + key.toString() + " value:" + value.toString();
		}
		return ret;
	}

}
