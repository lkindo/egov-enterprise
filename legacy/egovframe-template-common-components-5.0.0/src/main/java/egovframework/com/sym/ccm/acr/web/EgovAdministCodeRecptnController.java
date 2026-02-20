package egovframework.com.sym.ccm.acr.web;

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
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptn;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptnVO;
import egovframework.com.sym.ccm.acr.service.EgovAdministCodeRecptnService;
import jakarta.annotation.Resource;

/**
 *
 * 踰뺤젙?숈퐫?쒕? ?섏떊??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳 Controller瑜??뺤쓽?쒕떎
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
public class EgovAdministCodeRecptnController {

	@Resource(name = "AdministCodeRecptnService")
    private EgovAdministCodeRecptnService administCodeManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * TEST ??Controller
	 * ???곸슜??Job Scheduler ???깅줉?섏뿬 泥섎━?쒕떎.
	 * 踰뺤젙?숈퐫?쒕? ?섏떊泥섎━?쒕떎.
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist"
	 * @throws Exception
	 */
    @RequestMapping(value="/sym/ccm/acr/addAdministCode.do")
	public String insertAdministCodeRecptn (AdministCodeRecptn administCodeRecptn
			, BindingResult bindingResult
			, @RequestParam Map<?, ?> commandMap
			, ModelMap model
			) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
    	if   (sCmd.equals("")) {

	    	administCodeManageService.insertAdministCodeRecptn();

    		return "egovframework/com/sym/ccm/acr/EgovAdministCodeRegist_TEST";
    	} else {
	        return "forward:/sym/ccm/acr/getAdministCodeRecptnList.do";
    	}
    }

	/**
	 * 踰뺤젙?숈퐫???곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeDetail"
	 * @throws Exception
	 */
	@RequestMapping(value="/sym/ccm/acr/getAdministCodeDetail.do")
 	public String selectAdministCodeDetail (@ModelAttribute("administCode") AdministCodeRecptn administCode
			, @ModelAttribute("administCodeRecptnVO") AdministCodeRecptnVO administCodeRecptnVO
			, ModelMap model
 			) throws Exception {
		/* 踰뺤젙?숈퐫??議고쉶 */
		AdministCodeRecptn vo = administCodeManageService.selectAdministCodeDetail(administCode);
		model.addAttribute("result", vo);

    	/* 踰뺤젙?숈퐫?쒖닔??由ъ뒪??*/
    	administCodeRecptnVO.setRecordCountPerPage(9999999);
    	administCodeRecptnVO.setFirstIndex(0);


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

        administCodeRecptnVO.setSearchCondition("CodeList");
        List<EgovMap> administCodeRecptnList = administCodeManageService.selectAdministCodeRecptnList(administCodeRecptnVO);
        model.addAttribute("administCodeRecptnList", administCodeRecptnList);

		return "egovframework/com/sym/ccm/acr/EgovAdministCodeDetail";
	}

    /**
	 * 踰뺤젙?숈퐫?쒖닔??紐⑸줉??議고쉶?쒕떎.
     * @param loginVO
     * @param searchVO
     * @param model
     * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList"
     * @throws Exception
     */
	@IncludedInfo(name="?됱젙肄붾뱶愿由?, listUrl="/sym/ccm/acr/getAdministCodeRecptnList.do", order = 1010 ,gid = 60)
    @RequestMapping(value="/sym/ccm/acr/getAdministCodeRecptnList.do")
	public String selectAdministCodeRecptnList (@ModelAttribute("searchVO") AdministCodeRecptnVO searchVO
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

        List<EgovMap> administCodeRecptnList = administCodeManageService.selectAdministCodeRecptnList(searchVO);
        model.addAttribute("resultList", administCodeRecptnList);

        int totCnt = administCodeManageService.selectAdministCodeRecptnListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/ccm/acr/EgovAdministCodeRecptnList";
	}

    /**
	 * 踰뺤젙?숈퐫?쒖닔??媛쒖씤?뷀럹?댁???紐⑸줉??議고쉶?쒕떎.
     * @param loginVO
     * @param searchVO
     * @param model
     * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList"
     * @throws Exception
     */
    @RequestMapping(value="/sym/ccm/acr/getAdministCodeRecptnMainList.do")
	public String selectAdministCodeRecptnMainList (@ModelAttribute("searchVO") AdministCodeRecptnVO searchVO
			, ModelMap model
			) throws Exception {
    	/** pageing */
		searchVO.setRecordCountPerPage(6);
		searchVO.setFirstIndex(0);

        List<EgovMap> administCodeRecptnList = administCodeManageService.selectAdministCodeRecptnList(searchVO);
        model.addAttribute("resultList", administCodeRecptnList);

        int totCnt = administCodeManageService.selectAdministCodeRecptnListTotCnt(searchVO);
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/ccm/acr/EgovAdministCodeRecptnMainList";
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