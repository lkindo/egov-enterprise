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
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------

 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 *      </pre>
 */
/**
 * ?곌퀎硫붿떆吏 愿由ъ뿉 愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳
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
 *   20110.8.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.06.27  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovCntcMessageController {

	@Resource(name = "CntcMessageService")
	private EgovCntcMessageService cntcMessageService;

	/** EgovIdGnrService */
	@Resource(name = "egovCntcMessageIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovIdGnrService */
	@Resource(name = "egovCntcMessageItemIdGnrService")
	private EgovIdGnrService idgenServiceItem;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?곌퀎硫붿떆吏瑜???젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param model
	 * @return "forward:/ssi/syi/ims/EgovCcmAdministCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/removeCntcMessage.do")
	public String deleteCntcMessage(CntcMessage cntcMessage, ModelMap model) throws Exception {
		cntcMessageService.deleteCntcMessage(cntcMessage);
		return "forward:/ssi/syi/ims/getCntcMessageList.do";
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ????젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param model
	 * @return "forward:/ssi/syi/ims/EgovCcmAdministCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/removeCntcMessageItem.do")
	public String deleteCntcMessageItem(CntcMessageItem cntcMessageItem, ModelMap model) throws Exception {
		cntcMessageService.deleteCntcMessageItem(cntcMessageItem);
		return "forward:/ssi/syi/ims/getCntcMessageList.do";
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??깅줉?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmCntcMessageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/addCntcMessage.do")
	public String insertCntcMessage(@Valid  @ModelAttribute("cntcMessage") CntcMessage cntcMessage, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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
				// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageRegist";
			}

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
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
	 * ?곌퀎硫붿떆吏 ??ぉ???깅줉?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmCntcMessageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/addCntcMessageItem.do")
	public String insertCntcMessageItem(@Valid @ModelAttribute("cntcMessageItem") CntcMessageItem cntcMessageItem,
			BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {

			// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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
				// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
				CntcMessageVO searchCntcMessageVO;
				searchCntcMessageVO = new CntcMessageVO();
				searchCntcMessageVO.setRecordCountPerPage(999999);
				searchCntcMessageVO.setFirstIndex(0);
				searchCntcMessageVO.setSearchCondition("CodeList");
				List<EgovMap> cntcMessageList = cntcMessageService.selectCntcMessageList(searchCntcMessageVO);
				model.addAttribute("cntcMessageList", cntcMessageList);

				return "egovframework/com/ssi/syi/ims/EgovCntcMessageItemRegist";
			}

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
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
	 * ?곌퀎硫붿떆吏 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmCntcMessageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/getCntcMessageDetail.do")
	public String selectCntcMessageDetail(@ModelAttribute("cntcMessage") CntcMessage cntcMessage,
			@ModelAttribute("cntcMessageItemVO") CntcMessageItemVO cntcMessageItemVO, ModelMap model) throws Exception {
		/* ?곌퀎硫붿떆吏 ?곸꽭 */
		CntcMessage vo = cntcMessageService.selectCntcMessageDetail(cntcMessage);
		model.addAttribute("result", vo);

		/* ?곌퀎硫붿떆吏??ぉ 由ъ뒪??*/
		cntcMessageItemVO.setRecordCountPerPage(9999999);
		cntcMessageItemVO.setFirstIndex(0);

		cntcMessageItemVO.setSearchCondition("CodeList");
		List<EgovMap> cntcMessageItemList = cntcMessageService.selectCntcMessageItemList(cntcMessageItemVO);
		model.addAttribute("cntcMessageItemList", cntcMessageItemList);

		return "egovframework/com/ssi/syi/ims/EgovCntcMessageDetail";
	}

	/**
	 * ?곌퀎硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmCntcMessageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?곌퀎硫붿떆吏愿由?, listUrl = "/ssi/syi/ims/getCntcMessageList.do", order = 1230, gid = 70)
	@RequestMapping(value = "/ssi/syi/ims/getCntcMessageList.do")
	public String selectCntcMessageList(@ModelAttribute("searchVO") CntcMessageVO searchVO, ModelMap model)
			throws Exception {
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

		List<EgovMap> resultList = cntcMessageService.selectCntcMessageList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cntcMessageService.selectCntcMessageListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/ims/EgovCntcMessageList";
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??섏젙?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessage
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmAdministCodeModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/updateCntcMessage.do")
	public String updateCntcMessage(@Valid @ModelAttribute("cntcMessage") CntcMessage cntcMessage, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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
				// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
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
	 * ?곌퀎硫붿떆吏??ぉ???섏젙?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcMessageItem
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/ssi/syi/ims/EgovCcmAdministCodeModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ims/updateCntcMessageItem.do")
	public String updateCntcMessageItem(@Valid @ModelAttribute("cntcMessageItem") CntcMessageItem cntcMessageItem,
			BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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
				// ?곌퀎硫붿떆吏 由ъ뒪?몃컯???곗씠??
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

			// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
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