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
 * ?????? ???????????????????? ??????????????? ?????????? ???? Controller?????
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *   2011.8.26	???		IncludedInfo annotation ??
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 **/

@Controller
public class EgovAdministCodeRecptnController {

	@Resource(name = "AdministCodeRecptnService")
    private EgovAdministCodeRecptnService administCodeManageService;

    /** EgovPropertyService **/
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * TEST ??Controller
	 * ?????Job Scheduler ????? ???.
	 * ?????? ?????.
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeRegist"   
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
	 * ?????????????.
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value="/sym/ccm/acr/getAdministCodeDetail.do")
 	public String selectAdministCodeDetail (@ModelAttribute("administCode") AdministCodeRecptn administCode
			, @ModelAttribute("administCodeRecptnVO") AdministCodeRecptnVO administCodeRecptnVO
			, ModelMap model
 			) throws Exception {
		/* ???????*/
		AdministCodeRecptn vo = administCodeManageService.selectAdministCodeDetail(administCode);
		model.addAttribute("result", vo);

    	/* ??????????*/
    	administCodeRecptnVO.setRecordCountPerPage(9999999);
    	administCodeRecptnVO.setFirstIndex(0);


    	/* ????*/
    	ComDefaultCodeVO comCodeVO = new ComDefaultCodeVO();

    	/* ???*/
    	comCodeVO.setCodeId("COM043");
        List<CmmnDetailCode> changeSeCodeList = cmmUseService.selectCmmCodeDetail(comCodeVO);
        model.addAttribute("changeSeCodeList", changeSeCodeList);

    	/* ??? */
        comCodeVO.setCodeId("COM044");
        List<CmmnDetailCode> processSeList = cmmUseService.selectCmmCodeDetail(comCodeVO);
        model.addAttribute("processSeList", processSeList);

        administCodeRecptnVO.setSearchCondition("CodeList");
        List<EgovMap> administCodeRecptnList = administCodeManageService.selectAdministCodeRecptnList(administCodeRecptnVO);
        model.addAttribute("administCodeRecptnList", administCodeRecptnList);

		return "egovframework/com/sym/ccm/acr/EgovAdministCodeDetail";
	}

    /**
	 * ????????????.
     * @param loginVO
     * @param searchVO
     * @param model
     * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeList"   
     * @throws Exception
     */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
    @RequestMapping(value="/sym/ccm/acr/getAdministCodeRecptnList.do")
	public String selectAdministCodeRecptnList (@ModelAttribute("searchVO") AdministCodeRecptnVO searchVO
			, ModelMap model
			) throws Exception {
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

        List<EgovMap> administCodeRecptnList = administCodeManageService.selectAdministCodeRecptnList(searchVO);
        model.addAttribute("resultList", administCodeRecptnList);

        int totCnt = administCodeManageService.selectAdministCodeRecptnListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/ccm/acr/EgovAdministCodeRecptnList";
	}

    /**
	 * ????????????????????.
     * @param loginVO
     * @param searchVO
     * @param model
     * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeList"   
     * @throws Exception
     */
    @RequestMapping(value="/sym/ccm/acr/getAdministCodeRecptnMainList.do")
	public String selectAdministCodeRecptnMainList (@ModelAttribute("searchVO") AdministCodeRecptnVO searchVO
			, ModelMap model
			) throws Exception {
    	/** pageing **/
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
     * Map ???????.
     * @param commandMap
     * @return
     **/
	public String printParameterMap(@RequestParam Map<?, ?> commandMap){
		String ret = "";
       	for(Object key:commandMap.keySet()){
    		Object value = commandMap.get(key);

    		ret += "key:" + key.toString() + " value:" + value.toString();
    	}
       	return ret;
	}

}
