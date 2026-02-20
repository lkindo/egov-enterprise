package egovframework.com.uss.ion.nts.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import egovframework.com.cmm.resolver.EgovSecurityMap;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.nts.service.EgovNoteTrnsmitService;
import egovframework.com.uss.ion.nts.service.NoteTrnsmit;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 蹂대궦履쎌??④?由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *    2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
public class EgovNoteTrnsmitController {

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** egovOnlinePollService */
    @Resource(name = "egovNoteTrnsmitService")
    private EgovNoteTrnsmitService egovNoteTrnsmitService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovNoteTrnsmitController.class);

    /**
     * 蹂대궦履쎌??④?由?紐⑸줉??議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param noteTrnsmit -蹂대궦履쎌??⑥젙蹂닿? ?닿릿媛앹껜
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
	@IncludedInfo(name="蹂대궦履쎌??④?由?, order = 860 ,gid = 50)
    @RequestMapping(value = "/uss/ion/nts/listNoteTrnsmit.do")
    public String EgovNoteTrnsmitList(
    		@ModelAttribute("searchVO") NoteTrnsmit searchVO,
    		@ModelAttribute("userMap") @RequestParam Map<?, ?> commandMap,
            @ModelAttribute("noteTrnsmit") NoteTrnsmit noteTrnsmit,
            EgovSecurityMap securitymap,
            ModelMap model) throws Exception {

    	//蹂???ㅼ젙
    	String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");


    	LOGGER.info("userMap>"+commandMap);

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

        	LOGGER.debug("##### EgovNoteTrnsmitController EgovNoteTrnsmitList()  start");
        	LOGGER.debug("noteId > {}", commandMap.get("noteIdAll"));
        	LOGGER.debug("noteTrnsmitId > {}", commandMap.get("noteTrnsmitIdAll"));

        	String[] aNoteId = ((String) commandMap.get("noteIdAll")).split(",");
            String[] aNoteTrnsmitId = ((String)commandMap.get("noteTrnsmitIdAll")).split(",");

            for(int i=0; i < aNoteId.length; i++) {
            	String sNoteId = aNoteId[i];
            	String sNoteTrnsmitId = aNoteTrnsmitId[i];

            	securitymap.put("noteId", sNoteId);
	            securitymap.put("noteTrnsmitId", sNoteTrnsmitId);

	            LOGGER.debug("sArrCheckListValue[0] > {}", securitymap.get("noteId"));
	            LOGGER.debug("sArrCheckListValue[1] > {}", securitymap.get("noteTrnsmitId"));

	            noteTrnsmit.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            noteTrnsmit.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            noteTrnsmit.setNoteId(securitymap.get("noteId"));
	            noteTrnsmit.setNoteTrnsmitId(securitymap.get("noteTrnsmitId"));
	            noteTrnsmit.setTrnsmiterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

	            egovNoteTrnsmitService.deleteNoteTrnsmit(noteTrnsmit);

            }

	        //??젣???섏씠吏 ?몃뜳???ㅼ젙
	        searchVO.setPageIndex(1);
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
        searchVO.setTrnsmiterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        List<EgovMap> reusltList = egovNoteTrnsmitService.selectNoteTrnsmitList(searchVO);
        model.addAttribute("resultList", reusltList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

        int totCnt = egovNoteTrnsmitService.selectNoteTrnsmitListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);


    	return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitList";

    }

    /**
     * 蹂대궦履쎌??④?由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/nts/detailNoteTrnsmit.do")
    public String EgovNoteTrnsmitDetail(
    		@ModelAttribute("searchVO") NoteTrnsmit searchVO,
    		EgovSecurityMap securityMap,
            ModelMap model) throws Exception {

    		String sLocationUrl = "egovframework/com/uss/ion/nts/EgovNoteTrnsmitDetail";

            String sCmd = securityMap.get("cmd") == null ? "" : (String) securityMap.get("cmd");

    		//Spring Security ?ъ슜?먭텒??泥섎━
    	    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	    if (!isAuthenticated) {
    	        model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
    	        return "redirect:/uat/uia/egovLoginUsr.do";
    	    }

            //濡쒓렇??媛앹껜 ?좎뼵
            LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

            securityMap.put("noteId",searchVO.getNoteId());
            securityMap.put("noteTrnsmitId", searchVO.getNoteTrnsmitId());

            if(sCmd.equals("del")){
            	searchVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
            	searchVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
            	searchVO.setTrnsmiterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
            	egovNoteTrnsmitService.deleteNoteTrnsmit(searchVO);

            	sLocationUrl = "redirect:/uss/ion/nts/listNoteTrnsmit.do";
            }else{
            	searchVO.setTrnsmiterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

            	Map<?, ?> noteTrnsmitMap = egovNoteTrnsmitService.selectNoteTrnsmitDetail(searchVO);
            	model.addAttribute("noteTrnsmit", noteTrnsmitMap);

            	egovframework.com.uss.ion.nts.service.NoteTrnsmit noteTrnsmit = new egovframework.com.uss.ion.nts.service.NoteTrnsmit();
            	noteTrnsmit.setNoteId(searchVO.getNoteId());

                List<EgovMap> resultRecptnEmp = egovNoteTrnsmitService.selectNoteTrnsmitCnfirm(noteTrnsmit);
            	model.addAttribute("resultRecptnEmp", resultRecptnEmp);
            }

    		return sLocationUrl;
    }

    /**
     * ?섏떊?먮ぉ濡앹쓣 議고쉶?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌????뺣낫媛 ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/nts/selectNoteTrnsmitCnfirm.do")
    public String EgovNoteTrnsmitCnfirm(
    		NoteTrnsmit noteTrnsmit,
    		@RequestParam Map<?, ?> commandMap,
            ModelMap model) throws Exception {

            List<EgovMap> resultList = egovNoteTrnsmitService.selectNoteTrnsmitCnfirm(noteTrnsmit);
        	model.addAttribute("resultList", resultList);

    		return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitCnfirm";
    }

}
