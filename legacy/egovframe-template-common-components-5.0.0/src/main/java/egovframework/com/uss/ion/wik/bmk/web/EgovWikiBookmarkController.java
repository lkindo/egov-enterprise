package egovframework.com.uss.ion.wik.bmk.web;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.wik.bmk.service.EgovWikiBookmarkService;
import egovframework.com.uss.ion.wik.bmk.service.WikiBookmark;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * ?꾪궎遺곷쭏?щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.10.20
 * @version 1.0
 * @see
 * <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
public class EgovWikiBookmarkController {

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** egovOnlinePollService */
    @Resource(name = "egovWikiBookmarkService")
    private EgovWikiBookmarkService egovWikiBookmarkService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovWikiBookmarkController.class);

    /**
     * ?꾪궎遺곷쭏??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO -?꾪궎遺곷쭏??model
     * @param searchVO -?꾪궎遺곷쭏??model
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @IncludedInfo(name="Wiki湲곕뒫", order = 810 ,gid = 50)
    @RequestMapping(value = "/uss/ion/wik/bmk/listWikiBookmark.do")
    public String EgovWikiBookmarkList(
    		@ModelAttribute("searchVO") WikiBookmark searchVO,
    		WikiBookmark wikiBookmark,
    		@RequestParam Map<?, ?> commandMap,
    		@RequestParam(value="checkList", required=false) List<String> checkList,
            ModelMap model) throws Exception {

    	//蹂???ㅼ젙
    	String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		//Spring Security ?ъ슜?먭텒??泥섎━
	    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	    if (!isAuthenticated) {
	        model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

        //濡쒓렇??媛앹껜 ?좎뼵
        LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        //??젣 紐⑤뱶濡??ㅽ뻾??
        if(sCmd.equals("del")){

        	for(String checkData : checkList) {
        		LOGGER.debug("===>>> checkData = "+checkData);
                wikiBookmark.setWikiBkmkId(checkData);
	            egovWikiBookmarkService.deleteWikiBookmark(wikiBookmark);
            }

	        //?섏씠吏 ?명뀓???ㅼ젙
	        searchVO.setPageIndex(1);

	        return "redirect:/uss/ion/wik/bmk/listWikiBookmark.do";
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

        searchVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        List<?> reusltList = egovWikiBookmarkService.selectWikiBookmarkList(searchVO);
        model.addAttribute("resultList", reusltList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

        int totCnt = egovWikiBookmarkService.selectWikiBookmarkListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

    	return "egovframework/com/uss/ion/wik/bmk/EgovWikiBookmarkList";
	}

    /**
     * ?꾪궎遺곷쭏?щ? ?깅줉 ?쒕떎.
     * @param wikiBookmark -?꾪궎遺곷쭏??model
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/wik/bmk/registWikiBookmark.do")
    public String EgovWikiBookmarkRegist(
    		WikiBookmark wikiBookmark,
            ModelMap model) throws Exception {

    	String sDupl = "N";

    	if(wikiBookmark.getUsid() != null &&  wikiBookmark.getWikiBkmkNm() != null){
    		if(egovWikiBookmarkService.selectWikiBookmarkDuplicationCnt(wikiBookmark) > 0){
    			sDupl = "Y";
    		}else{
    			egovWikiBookmarkService.insertWikiBookmark(wikiBookmark);
    		}
    	}
    	//log.debug("Controller EgovWikiBookmarkRegist.WikiBookmark>" + wikiBookmark);
    	//以묐났 ?ㅼ젙
    	model.addAttribute("S_DUPL", sDupl);
    	return "egovframework/com/uss/ion/wik/bmk/EgovWikiBookmarkRegist";
	}

}
