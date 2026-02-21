package egovframework.com.ssi.syi.ims.web;

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
import egovframework.com.ssi.syi.ims.service.CntcMessage;
import egovframework.com.ssi.syi.ims.service.CntcMessageItem;
import egovframework.com.ssi.syi.ims.service.CntcMessageItemVO;
import egovframework.com.ssi.syi.ims.service.CntcMessageVO;
import egovframework.com.ssi.syi.ims.service.EgovCntcMessageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 *

 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------

 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 *      </pre>
 **/
/**
 * ? ?? ???????????????? ??????????????? ?????????? ????
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
 *   20110.8.26  ???         IncludedInfo annotation ??
 *   2025.06.27  ????         ??????PMD???????? ????????-LocalVariableNamingConventions(???????
 *
 *      </pre>
 **/
@Controller
public class EgovCntcMessageController {

	@Resource(name = "CntcMessageService")
	private EgovCntcMessageService cntcMessageService;

	/** EgovIdGnrService **/
	@Resource(name = "egovCntcMessageIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovIdGnrService **/
	@Resource(name = "egovCntcMessageItemIdGnrService")
	private EgovIdGnrService idgenServiceItem;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ????????.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param model
	 * @return "forward: ssi/syi/ims/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/removeCntcMessage.do")
	public String deleteCntcMessage(CntcMessage cntcMessage, ModelMap model) throws Exception {
		cntcMessageService.deleteCntcMessage(cntcMessage);
		return "forward:/ssi/syi/ims/getCntcMessageList.do";
	}

	/**
	 * ???????????.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param model
	 * @return "forward: ssi/syi/ims/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/removeCntcMessageItem.do")
	public String deleteCntcMessageItem(CntcMessageItem cntcMessageItem, ModelMap model) throws Exception {
		cntcMessageService.deleteCntcMessageItem(cntcMessageItem);
		return "forward:/ssi/syi/ims/getCntcMessageList.do";
	}

	/**
	 * ??????.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmCntcMessageRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/addCntcMessage.do")
	public String insertCntcMessage(@Valid  @ModelAttribute("cntcMessage") CntcMessage cntcMessage, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			return "egovframework/com/ssi/syi/ims/EgovCntcMessageRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {
				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageRegist";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			cntcMessage.setFrstRegisterId(uniqId);

			// ID Generation
			String sCntcMessageId = idgenService.getNextStringId();
			cntcMessage.setCntcMessageId(sCntcMessageId);

			cntcMessageService.insertCntcMessage(cntcMessage);
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
		} else {
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
		}
	}

	/**
	 * ? ????????.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmCntcMessageRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/addCntcMessageItem.do")
	public String insertCntcMessageItem(@Valid @ModelAttribute("cntcMessageItem") CntcMessageItem cntcMessageItem,
			BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {

			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			return "egovframework/com/ssi/syi/ims/EgovCntcMessageItemRegist";
		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {
				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageItemRegist";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			cntcMessageItem.setFrstRegisterId(uniqId);

			// ID Generation
			String sItemId = idgenServiceItem.getNextStringId();
			cntcMessageItem.setItemId(sItemId);

			cntcMessageService.insertCntcMessageItem(cntcMessageItem);
			return "forward:/ssi/syi/ims/getCntcMessageDetail.do";
		} else {
			return "forward:/ssi/syi/ims/getCntcMessageDetail.do";
		}
	}

	/**
	 * ? ????????.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmCntcMessageDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/getCntcMessageDetail.do")
	public String selectCntcMessageDetail(@ModelAttribute("cntcMessage") CntcMessage cntcMessage,
			@ModelAttribute("cntcMessageItemVO") CntcMessageItemVO cntcMessageItemVO, ModelMap model) throws Exception {
		/* ? ? */
		CntcMessage vo = cntcMessageService.selectCntcMessageDetail(cntcMessage);
		model.addAttribute("result", vo);

		/* ????????*/
		cntcMessageItemVO.setRecordCountPerPage(9999999);
		cntcMessageItemVO.setFirstIndex(0);

		cntcMessageItemVO.setSearchCondition("CodeList");
		List<EgovMap> cntcMessageItemList = cntcMessageService.selectCntcMessageItemList(cntcMessageItemVO);
		model.addAttribute("cntcMessageItemList", cntcMessageItemList);

		return "egovframework/com/ssi/syi/ims/EgovCntcMessageDetail";
	}

	/**
	 * ? ?????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmCntcMessageList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/ssi/syi/ims/getCntcMessageList.do")
	public String selectCntcMessageList(@ModelAttribute("searchVO") CntcMessageVO searchVO, ModelMap model)
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

		List<EgovMap> resultList = cntcMessageService.selectCntcMessageList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cntcMessageService.selectCntcMessageListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/ims/EgovCntcMessageList";
	}

	/**
	 * ???????.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmAdministCodeModify"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/updateCntcMessage.do")
	public String updateCntcMessage(@Valid @ModelAttribute("cntcMessage") CntcMessage cntcMessage, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			CntcMessage vo = cntcMessageService.selectCntcMessageDetail(cntcMessage);
			model.addAttribute("cntcMessage", vo);

			return "egovframework/com/ssi/syi/ims/EgovCntcMessageUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				CntcMessage vo = cntcMessageService.selectCntcMessageDetail(cntcMessage);
				model.addAttribute("cntcMessage", vo);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageUpdt";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			cntcMessage.setLastUpdusrId(uniqId);
			cntcMessageService.updateCntcMessage(cntcMessage);
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
		} else {
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
		}
	}

	/**
	 * ??????????.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework com/ssi/syi/ims/EgovCcmAdministCodeModify"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/updateCntcMessageItem.do")
	public String updateCntcMessageItem(@Valid @ModelAttribute("cntcMessageItem") CntcMessageItem cntcMessageItem,
			BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ? ???????
			CntcMessageVO searchCntcMessageVO;
			searchCntcMessageVO = new CntcMessageVO();
			searchCntcMessageVO.setRecordCountPerPage(999999);
			searchCntcMessageVO.setFirstIndex(0);
			searchCntcMessageVO.setSearchCondition("CodeList");
			List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
			model.addAttribute("cntcMessageList", cntcMessageList);

			CntcMessageItem vo = cntcMessageService.selectCntcMessageItemDetail(cntcMessageItem);
			model.addAttribute("cntcMessageItem", vo);

			return "egovframework/com/ssi/syi/ims/EgovCntcMessageItemUpdt";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				// ? ???????
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				CntcMessageItem vo = cntcMessageService.selectCntcMessageItemDetail(cntcMessageItem);
				model.addAttribute("cntcMessageItem", vo);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageItemUpdt";
			}

			// ????? ?????? ??
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			cntcMessageItem.setLastUpdusrId(uniqId);
			cntcMessageService.updateCntcMessageItem(cntcMessageItem);
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
		} else {
			return "forward:/ssi/syi/ims/getCntcMessageList.do";
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
