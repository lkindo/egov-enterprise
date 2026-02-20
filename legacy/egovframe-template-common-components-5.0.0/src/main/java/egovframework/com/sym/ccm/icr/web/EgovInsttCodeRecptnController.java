package egovframework.com.sym.ccm.icr.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sym.ccm.icr.service.EgovInsttCodeRecptnService;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptn;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptnVO;
import jakarta.annotation.Resource;

/**
 *
 * 湲곌?肄붾뱶瑜??섏떊??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳 Controller瑜??뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */

@Controller
public class EgovInsttCodeRecptnController {

	@Resource(name = "InsttCodeRecptnService")
    private EgovInsttCodeRecptnService insttCodeManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * TEST ??Controller
	 * ???곸슜??Job Scheduler ???깅줉?섏뿬 泥섎━?쒕떎.
	 * 湲곌?肄붾뱶瑜??섏떊泥섎━?쒕떎.
	 *
	 * @param insttCodeRecptn
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/sym/ccm/icr/EgovInsttCodeRegist_TEST"
	 * @return "forward:/sym/ccm/icr/getInsttCodeRecptnList.do"
	 * @throws Exception
	 */
    @RequestMapping(value="/sym/ccm/icr/addInsttCode.do")
	public String insertInsttCodeRecptn (InsttCodeRecptn insttCodeRecptn
			, BindingResult bindingResult
			, @RequestParam Map<?, ?> commandMap
			, ModelMap model
			) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
    	if   (sCmd.equals("")) {
	    	insttCodeManageService.insertInsttCodeRecptn();

    		return "egovframework/com/sym/ccm/icr/EgovInsttCodeRegist_TEST";
    	} else {
	        return "forward:/sym/ccm/icr/getInsttCodeRecptnList.do";
    	}
    }

	/**
	 * 湲곌?肄붾뱶 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param insttCode
	 * @param insttCodeRecptnVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/sym/ccm/icr/getInsttCodeDetail.do")
 	public String selectInsttCodeDetail (@ModelAttribute("insttCode") InsttCodeRecptn insttCode
			, @ModelAttribute("insttCodeRecptnVO") InsttCodeRecptnVO insttCodeRecptnVO
			, ModelMap model
 			) throws Exception {
		/* 湲곌?肄붾뱶 議고쉶 */
		InsttCodeRecptn vo = insttCodeManageService.selectInsttCodeDetail(insttCode);
		model.addAttribute("result", vo);

    	/* 湲곌?肄붾뱶?섏떊 由ъ뒪??*/
    	insttCodeRecptnVO.setRecordCountPerPage(9999999);
    	insttCodeRecptnVO.setFirstIndex(0);


    	/* 怨듯넻肄붾뱶泥섎━ */
    	ComDefaultCodeVO comCodeVO = new ComDefaultCodeVO();

    	/* 蹂寃쎄뎄遺꾩퐫??*/
    	comCodeVO.setCodeId("COM043");
        List<CmmnDetailCode> changeSeCodeList = cmmUseService.selectCmmCodeDetail(comCodeVO);
        model.addAttribute("changeSeCodeList", changeSeCodeList);

    	/* 泥섎━援щ텇肄붾뱶 */
        comCodeVO.setCodeId("COM044");
        List<CmmnDetailCode> processSeList = cmmUseService.selectCmmCodeDetail(comCodeVO);
        model.addAttribute("processSeList", processSeList);

        insttCodeRecptnVO.setSearchCondition("CodeList");
        List<EgovMap> insttCodeRecptnList = insttCodeManageService.selectInsttCodeRecptnList(insttCodeRecptnVO);
        model.addAttribute("insttCodeRecptnList", insttCodeRecptnList);

		return "egovframework/com/sym/ccm/icr/EgovInsttCodeDetail";
	}

    /**
     * 湲곌?肄붾뱶?섏떊 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @param model
     * @return "egovframework/com/sym/ccm/icr/EgovInsttCodeRecptnList"
     * @throws Exception
     */
	@IncludedInfo(name="湲곌?肄붾뱶?섏떊", listUrl="/sym/ccm/icr/getInsttCodeRecptnList.do", order = 1020 ,gid = 60)
    @RequestMapping(value="/sym/ccm/icr/getInsttCodeRecptnList.do")
	public String selectInsttCodeRecptnList (@ModelAttribute("searchVO") InsttCodeRecptnVO searchVO
			, ModelMap model
			) throws Exception {
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

        List<EgovMap> insttCodeRecptnList = insttCodeManageService.selectInsttCodeRecptnList(searchVO);
        model.addAttribute("resultList", insttCodeRecptnList);

        int totCnt = insttCodeManageService.selectInsttCodeRecptnListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/ccm/icr/EgovInsttCodeRecptnList";
	}

    /**
	 * 湲곌?肄붾뱶?섏떊 媛쒖씤?뷀럹?댁???紐⑸줉??議고쉶?쒕떎.
     * @param loginVO
     * @param searchVO
     * @param model
     * @return "egovframework/com/cmm/sym/ccm/EgovCcmInsttCodeList"
     * @throws Exception
     */
    @RequestMapping(value="/sym/ccm/icr/getInsttCodeRecptnMainList.do")
	public String selectInsttCodeRecptnMainList (@ModelAttribute("searchVO") InsttCodeRecptnVO searchVO
			, ModelMap model
			) throws Exception {
    	/** pageing */
		searchVO.setRecordCountPerPage(6);
		searchVO.setFirstIndex(0);

        List<EgovMap> insttCodeRecptnList = insttCodeManageService.selectInsttCodeRecptnList(searchVO);
        model.addAttribute("resultList", insttCodeRecptnList);

        int totCnt = insttCodeManageService.selectInsttCodeRecptnListTotCnt(searchVO);
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/ccm/icr/EgovInsttCodeRecptnMainList";
	}

    /**
     * Map ?댁슜???뺤씤?쒕떎.
     * @param commandMap
     * @return
     */
	public String printParameterMap(@RequestParam Map<?, ?> commandMap){
		String ret = "";
       	for(Object key:commandMap.keySet()){
    		Object value = commandMap.get(key);

    		ret += "key:" + key.toString() + " value:" + value.toString();
    	}
       	return ret;
	}

}