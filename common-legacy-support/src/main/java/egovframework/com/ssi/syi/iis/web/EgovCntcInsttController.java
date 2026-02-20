package egovframework.com.ssi.syi.iis.web;

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

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.ssi.syi.iis.service.CntcInstt;
import egovframework.com.ssi.syi.iis.service.CntcInsttVO;
import egovframework.com.ssi.syi.iis.service.CntcService;
import egovframework.com.ssi.syi.iis.service.CntcServiceVO;
import egovframework.com.ssi.syi.iis.service.CntcSystem;
import egovframework.com.ssi.syi.iis.service.CntcSystemVO;
import egovframework.com.ssi.syi.iis.service.EgovCntcInsttService;
import egovframework.com.ssi.syi.ims.service.CntcMessageVO;
import egovframework.com.ssi.syi.ims.service.EgovCntcMessageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 *

 * 
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------

 * Copyright (C) 2009 by MOPAS  All rights reserved.
 *      </pre>
 **/
/**
 * ?? ?? ???????????????? ??????????????? ?????????? ????
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
 *   2011.09.14  ?????         ??????????? ????? ?????????
 *   2025.06.27  ????         ??????PMD???????? ????????-LocalVariableNamingConventions(???????
 *
 *      </pre>
 **/
@Controller
public class EgovCntcInsttController {

	@Resource(name = "CntcInsttService")
	private EgovCntcInsttService cntcInsttService;

	@Resource(name = "CntcMessageService")
	private EgovCntcMessageService cntcMessageService;

	/** EgovIdGnrService **/
	@Resource(name = "egovCntcInsttIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovIdGnrService **/
	@Resource(name = "egovCntcSystemIdGnrService")
	private EgovIdGnrService idgenServiceSys;

	/** EgovIdGnrService **/
	@Resource(name = "egovCntcServiceIdGnrService")
	private EgovIdGnrService idgenServiceSvc;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?????????.
	 * 
	 * @param loginVO
	 * @param cntcInstt
	 * @param model
	 * @return "forward: ssi/syi/iis/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/removeCntcInstt.do")
	public String deleteCntcInstt(CntcInstt cntcInstt, ModelMap model) throws Exception {
		cntcInsttService.deleteCntcInstt(cntcInstt);
		return "forward:/ssi/syi/iis/getCntcInsttList.do";
	}

	/**
	 * ????? ?????.
	 * 
	 * @param loginVO
	 * @param cntcSystem
	 * @param model
	 * @return "forward: ssi/syi/iis/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/removeCntcSystem.do")
	public String deleteCntcSystem(CntcSystem cntcSystem, ModelMap model) throws Exception {
		cntcInsttService.deleteCntcSystem(cntcSystem);
		return "forward:/ssi/syi/iis/getCntcInsttList.do";
	}

	/**
	 * ?????? ?????.
	 * 
	 * @param loginVO
	 * @param cntcSystem
	 * @param model
	 * @return "forward: ssi/syi/iis/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/removeCntcService.do")
	public String deleteCntcService(CntcService cntcService, ModelMap model) throws Exception {
		cntcInsttService.deleteCntcService(cntcService);
		return "forward:/ssi/syi/iis/getCntcInsttList.do";
	}

	/**
	 * ???????.
	 * 
	 * @param loginVO
	 * @param cntcInstt
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcInsttRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/addCntcInstt.do")
	public String insertCntcInstt(@Valid @ModelAttribute("cntcInstt") CntcInstt cntcInstt, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {

			return "egovframework/com/ssi/syi/iis/EgovCntcInsttRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {

				return "egovframework/com/ssi/syi/iis/EgovCntcInsttRegist";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			cntcInstt.setFrstRegisterId(uniqId);

			// ID Generation
			String sInsttId = idgenService.getNextStringId();
			cntcInstt.setInsttId(sInsttId);

			cntcInsttService.insertCntcInstt(cntcInstt);

			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		}
	}

	/**
	 * ????? ???.
	 * 
	 * @param loginVO
	 * @param cntcSystem
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcSystemRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/addCntcSystem.do")
	public String insertCntcSystem(@Valid @ModelAttribute("cntcSystem") CntcSystem cntcSystem, BindingResult bindingResult,
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

			return "egovframework/com/ssi/syi/iis/EgovCntcSystemRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {
				// ?? ???????
				CntcInsttVO searchCntcInsttVO;
				searchCntcInsttVO = new CntcInsttVO();
				searchCntcInsttVO.setRecordCountPerPage(999999);
				searchCntcInsttVO.setFirstIndex(0);
				searchCntcInsttVO.setSearchCondition("CodeList");
				List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
				model.addAttribute("cntcInsttList", cntcInsttList);

				return "egovframework/com/ssi/syi/iis/EgovCntcSystemRegist";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			cntcSystem.setFrstRegisterId(uniqId);

			// ID Generation
			String sSysId = idgenServiceSys.getNextStringId();
			cntcSystem.setSysId(sSysId);

			cntcInsttService.insertCntcSystem(cntcSystem);
			return "forward:/ssi/syi/iis/getCntcInsttDetail.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttDetail.do";
		}
	}

	/**
	 * ?????? ???.
	 * 
	 * @param loginVO
	 * @param cntcService
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcServiceRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/addCntcService.do")
	public String insertCntcService(@Valid @ModelAttribute("cntcService") CntcService cntcService, BindingResult bindingResult,
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
			if (cntcService.getInsttId().equals("")) {
				if (cntcInsttList.size() > 0) {
					EgovMap emp = cntcInsttList.get(0);
					cntcService.setInsttId(emp.get("insttId").toString());
				}
			}
			searchCntcSystemVO.setInsttId(cntcService.getInsttId());
			List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcSystemList", cntcSystemList);

			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			return "egovframework/com/ssi/syi/iis/EgovCntcServiceRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {
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
				if (cntcService.getInsttId().equals("")) {
					if (cntcInsttList.size() > 0) {
						EgovMap emp = cntcInsttList.get(0);
						cntcService.setInsttId(emp.get("insttId").toString());
					}
				}
				searchCntcSystemVO.setInsttId(cntcService.getInsttId());
				List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
				model.addAttribute("cntcSystemList", cntcSystemList);

				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				return "egovframework/com/ssi/syi/iis/EgovCntcServiceRegist";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			cntcService.setFrstRegisterId(uniqId);

			// ID Generation
			String sSvcId = idgenServiceSvc.getNextStringId();
			cntcService.setSvcId(sSvcId);

			cntcInsttService.insertCntcService(cntcService);
			return "forward:/ssi/syi/iis/getCntcInsttDetail.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttDetail.do";
		}
	}

	/**
	 * ?? ????????.
	 * 
	 * @param loginVO
	 * @param cntcInstt
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCcmCntcInsttDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/getCntcInsttDetail.do")
	public String selectCntcInsttDetail(@ModelAttribute("cntcInstt") CntcInstt cntcInstt,
			@ModelAttribute("cntcSystemVO") CntcSystemVO cntcSystemVO,
			@ModelAttribute("cntcServiceVO") CntcServiceVO cntcServiceVO, ModelMap model) throws Exception {
		// ? ???????
		CntcMessageVO searchCntcMessageVO;
		searchCntcMessageVO = new CntcMessageVO();
		searchCntcMessageVO.setRecordCountPerPage(999999);
		searchCntcMessageVO.setFirstIndex(0);
		searchCntcMessageVO.setSearchCondition("CodeList");
		List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
		model.addAttribute("cntcMessageList", cntcMessageList);

		/* ?? ? */
		CntcInstt vo = cntcInsttService.selectCntcInsttDetail(cntcInstt);
		model.addAttribute("result", vo);

		/* ????????*/
		cntcSystemVO.setRecordCountPerPage(999999);
		cntcSystemVO.setFirstIndex(0);
		cntcSystemVO.setSearchCondition("CodeList");
		List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(cntcSystemVO);
		model.addAttribute("cntcSystemList", cntcSystemList);

		/* ????????*/
		cntcServiceVO.setRecordCountPerPage(999999);
		cntcServiceVO.setFirstIndex(0);
		cntcServiceVO.setSearchCondition("CodeList_InsttId");
		List<EgovMap> cntcServiceList = cntcInsttService.selectCntcServiceList(cntcServiceVO);
		model.addAttribute("cntcServiceList", cntcServiceList);

		return "egovframework/com/ssi/syi/iis/EgovCntcInsttDetail";
	}

	/**
	 * ?? ?????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcInsttList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/ssi/syi/iis/getCntcInsttList.do")
	public String selectCntcInsttList(@ModelAttribute("searchVO") CntcInsttVO searchVO, ModelMap model)
			throws Exception {
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

		List<EgovMap> resultList = cntcInsttService.selectCntcInsttList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cntcInsttService.selectCntcInsttListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/iis/EgovCntcInsttList";
	}

	/**
	 * ????????.
	 * 
	 * @param loginVO
	 * @param cntcInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcInsttUpdt"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/updateCntcInstt.do")
	public String updateCntcInstt(@Valid @ModelAttribute("cntcInstt") CntcInstt cntcInstt, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			CntcInstt vo = cntcInsttService.selectCntcInsttDetail(cntcInstt);
			model.addAttribute("cntcInstt", vo);

			return "egovframework/com/ssi/syi/iis/EgovCntcInsttUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				CntcInstt vo = cntcInsttService.selectCntcInsttDetail(cntcInstt);
				model.addAttribute("cntcInstt", vo);

				return "egovframework/com/ssi/syi/iis/EgovCntcInsttUpdt";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			cntcInstt.setLastUpdusrId(uniqId);
			cntcInsttService.updateCntcInstt(cntcInstt);
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		}
	}

	/**
	 * ????? ????.
	 * 
	 * @param loginVO
	 * @param cntcInstt
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcSystemModify"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/updateCntcSystem.do")
	public String updateCntcSystem(@Valid @ModelAttribute("cntcSystem") CntcSystem cntcSystem, BindingResult bindingResult,
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

			// ????????????2011.09.14
			CntcSystemVO searchCntcSystemVO;
			searchCntcSystemVO = new CntcSystemVO();
			searchCntcSystemVO.setRecordCountPerPage(999999);
			searchCntcSystemVO.setFirstIndex(0);
			searchCntcSystemVO.setSearchCondition("CodeList");
			if (cntcSystem.getInsttId().equals("")) {
				if (cntcInsttList.size() > 0) {
					EgovMap emp = cntcInsttList.get(0);
					cntcSystem.setInsttId(emp.get("insttId").toString());
				}
			}
			searchCntcSystemVO.setInsttId(cntcSystem.getInsttId());
			List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcSystemList", cntcSystemList);

			// ? ???????2011.09.14
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			CntcSystem vo = cntcInsttService.selectCntcSystemDetail(cntcSystem);
			model.addAttribute("cntcSystem", vo);

			return "egovframework/com/ssi/syi/iis/EgovCntcSystemUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				// ?? ???????
				CntcInsttVO searchCntcInsttVO;
				searchCntcInsttVO = new CntcInsttVO();
				searchCntcInsttVO.setRecordCountPerPage(999999);
				searchCntcInsttVO.setFirstIndex(0);
				searchCntcInsttVO.setSearchCondition("CodeList");
				List<EgovMap> cntcInsttList = cntcInsttService.selectCntcInsttList(searchCntcInsttVO);
				model.addAttribute("cntcInsttList", cntcInsttList);

				// ????????????2011.09.14
				CntcSystemVO searchCntcSystemVO;
				searchCntcSystemVO = new CntcSystemVO();
				searchCntcSystemVO.setRecordCountPerPage(999999);
				searchCntcSystemVO.setFirstIndex(0);
				searchCntcSystemVO.setSearchCondition("CodeList");
				if (cntcSystem.getInsttId().equals("")) {
					if (cntcInsttList.size() > 0) {
						EgovMap emp = cntcInsttList.get(0);
						cntcSystem.setInsttId(emp.get("insttId").toString());
					}
				}
				searchCntcSystemVO.setInsttId(cntcSystem.getInsttId());
				List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
				model.addAttribute("cntcSystemList", cntcSystemList);

				// ? ???????2011.09.14
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				CntcSystem vo = cntcInsttService.selectCntcSystemDetail(cntcSystem);
				model.addAttribute("cntcSystem", vo);

				return "egovframework/com/ssi/syi/iis/EgovCntcSystemUpdt";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			cntcSystem.setLastUpdusrId(uniqId);
			cntcInsttService.updateCntcSystem(cntcSystem);
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		}
	}

	/**
	 * ?????? ????.
	 * 
	 * @param loginVO
	 * @param cntcService
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/iis/EgovCntcServiceModify"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/iis/updateCntcService.do")
	public String updateCntcService(@Valid @ModelAttribute("cntcService") CntcService cntcService, BindingResult bindingResult,
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
			if (cntcService.getInsttId().equals("")) {
				if (cntcInsttList.size() > 0) {
					EgovMap emp = cntcInsttList.get(0);
					cntcService.setInsttId(emp.get("insttId").toString());
				}
			}
			searchCntcSystemVO.setInsttId(cntcService.getInsttId());
			List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
			model.addAttribute("cntcSystemList", cntcSystemList);

			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			CntcService vo = cntcInsttService.selectCntcServiceDetail(cntcService);
			model.addAttribute("cntcService", vo);

			return "egovframework/com/ssi/syi/iis/EgovCntcServiceUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
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
				if (cntcService.getInsttId().equals("")) {
					if (cntcInsttList.size() > 0) {
						EgovMap emp = cntcInsttList.get(0);
						cntcService.setInsttId(emp.get("insttId").toString());
					}
				}
				searchCntcSystemVO.setInsttId(cntcService.getInsttId());
				List<EgovMap> cntcSystemList = cntcInsttService.selectCntcSystemList(searchCntcSystemVO);
				model.addAttribute("cntcSystemList", cntcSystemList);

				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				CntcService vo = cntcInsttService.selectCntcServiceDetail(cntcService);
				model.addAttribute("cntcService", vo);

				return "egovframework/com/ssi/syi/iis/EgovCntcServiceUpdt";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			cntcService.setLastUpdusrId(uniqId);
			cntcInsttService.updateCntcService(cntcService);
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		} else {
			return "forward:/ssi/syi/iis/getCntcInsttList.do";
		}
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
