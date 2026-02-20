package egovframework.com.uss.ion.ntr.web;

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
import egovframework.com.uss.ion.ntr.service.EgovNoteRecptnService;
import egovframework.com.uss.ion.ntr.service.NoteRecptn;
import egovframework.com.uss.ion.nts.service.EgovNoteTrnsmitService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 諛쏆?履쎌??④?由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

@Controller
public class EgovNoteRecptnController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovNoteRecptnController.class);

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** egovOnlinePollService */
    @Resource(name = "egovNoteRecptnService")
    private EgovNoteRecptnService egovNoteRecptnService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /** egovNoteTrnsmitService */
    @Resource(name = "egovNoteTrnsmitService")
    private EgovNoteTrnsmitService egovNoteTrnsmitService;
    /**
     * 諛쏆?履쎌??④?由?紐⑸줉??議고쉶?쒕떎.
     * @param request -HttpServletRequest 媛앹껜
     * @param response -HttpServletResponse 媛앹껜
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 Model
     * @param commandMap -Request  Variable
     * @param noteRecptn -諛쏆?履쎌??④?由?Model
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @IncludedInfo(name="諛쏆?履쎌??④?由?, order = 850 ,gid = 50)
    @RequestMapping(value = "/uss/ion/ntr/listNoteRecptn.do")
    public String EgovNoteRecptnList(
			 HttpServletRequest request,
			 HttpServletResponse response,
    		@ModelAttribute("searchVO") NoteRecptn searchVO,
    		@RequestParam Map<?, ?> commandMap,
            @ModelAttribute("noteRecptn") NoteRecptn noteRecptn,
            EgovSecurityMap securitymap,
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
        	LOGGER.debug("##### EgovNoteRecptnController EgovNoteRecptnList()  start");
        	LOGGER.debug("noteId > {}", commandMap.get("noteIdAll"));
        	LOGGER.debug("noteTrnsmitId > {}", commandMap.get("noteTrnsmitIdAll"));
        	LOGGER.debug("noteRecptnId > {}", commandMap.get("noteRecptnIdAll"));

        	String[] aNoteId = ((String) commandMap.get("noteIdAll")).split(",");
            String[] aNoteTrnsmitId = ((String)commandMap.get("noteTrnsmitIdAll")).split(",");
            String[] aNoteRecptnId = ((String)commandMap.get("noteRecptnIdAll")).split(",");

            for(int i=0; i < aNoteId.length; i++) {
            	String sNoteId = aNoteId[i];
            	String sNoteTrnsmitId = aNoteTrnsmitId[i];
            	String sNoteRecptnId = aNoteRecptnId[i];

            	securitymap.put("noteId", sNoteId);
	            securitymap.put("noteTrnsmitId", sNoteTrnsmitId);
	            securitymap.put("noteRecptnId", sNoteRecptnId);

	            LOGGER.debug("sArrCheckListValue[0] > {}", securitymap.get("noteId"));
	            LOGGER.debug("sArrCheckListValue[1] > {}", securitymap.get("noteTrnsmitId"));
	            LOGGER.debug("sArrCheckListValue[2] > {}", securitymap.get("noteRecptnId"));

	            noteRecptn.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            noteRecptn.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            noteRecptn.setNoteId(securitymap.get("noteId"));
	            noteRecptn.setNoteTrnsmitId(securitymap.get("noteTrnsmitId"));
	            noteRecptn.setNoteRecptnId(securitymap.get("noteRecptnId"));
	            noteRecptn.setRcverId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

	            egovNoteRecptnService.deleteNoteRecptn(noteRecptn);
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
        //?섏떊?먯꽕??
        searchVO.setRcverId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        List<EgovMap> reusltList = egovNoteRecptnService.selectNoteRecptnList(searchVO);
        model.addAttribute("resultList", reusltList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

        int totCnt = egovNoteRecptnService.selectNoteRecptnListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

    	return "egovframework/com/uss/ion/ntr/EgovNoteRecptnList";

    }

    /**
     * 諛쏆?履쎌??④?由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 Model
     * @param commandMap -Request  Variable
     * @param noteRecptn -諛쏆?履쎌??④?由?Model
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/ntr/detailNoteRecptn.do")
    public String EgovNoteRecptnDetail(
    		@ModelAttribute("searchVO") NoteRecptn searchVO,
            @ModelAttribute("noteRecptn") NoteRecptn noteRecptn,
    		EgovSecurityMap securityMap,
            ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/nts/EgovNoteTrnsmitDetail";

        String sCmd = securityMap.get("cmd") == null ? "" : (String) securityMap.get("cmd");

        if(sCmd.equals("del")){
        	LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
            searchVO.setRcverId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
        	egovNoteRecptnService.deleteNoteRecptn(searchVO);

        	return "redirect:/uss/ion/ntr/listNoteRecptn.do";
        }else{
            //濡쒓렇??媛앹껜 ?좎뼵/?꾩씠?붿꽕??
            LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
            searchVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
            searchVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
            searchVO.setRcverId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        	Map<?, ?> noteRecptnMap = egovNoteRecptnService.selectNoteRecptnDetail(searchVO);
        	model.addAttribute("noteRecptn", noteRecptnMap);

        	egovframework.com.uss.ion.nts.service.NoteTrnsmit noteTrnsmit = new egovframework.com.uss.ion.nts.service.NoteTrnsmit();
        	LOGGER.debug("===> SecurityMap = "+securityMap);
        	securityMap.put("noteId", searchVO.getNoteId());
        	noteTrnsmit.setNoteId(searchVO.getNoteId());

            List<EgovMap> resultRecptnEmp = egovNoteTrnsmitService.selectNoteTrnsmitCnfirm(noteTrnsmit);
        	model.addAttribute("resultRecptnEmp", resultRecptnEmp);
        }

    	return "egovframework/com/uss/ion/ntr/EgovNoteRecptnDetail";
    }

}
