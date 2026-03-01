package egovframework.com.uss.olp.mgt.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.mgt.service.EgovMeetingManageService;
import egovframework.com.uss.olp.mgt.service.MeetingManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?뚯쓽愿由щ? 泥섎━?섍린 ?꾪븳 Controller 援ы쁽 Class
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
public class EgovMeetingManageController {

	/** Log Member Variable */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMeetingManageController.class);

	/** egovMeetingManageService Member Variable */
	@Resource(name = "egovMeetingManageService")
	private EgovMeetingManageService egovMeetingManageService;

    /** propertiesService Member Variable */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @RequestMapping(value="/uss/olp/mgt/EgovMeetingManageMain.do")
    public String egovMeetingManageMain(ModelMap model) throws Exception {
    	return "egovframework/com/uss/olp/mgt/EgovMeetingManageMain";
    }

    @RequestMapping(value="/uss/olp/mgt/EgovMeetingManageLeft.do")
    public String egovMeetingManageLeft(ModelMap model) throws Exception {
    	return "egovframework/com/uss/olp/mgt/EgovMeetingManageLeft";
    }

	/** EgovMessageSource Member Variable */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;


    /**
     * 媛쒕퀎 諛고룷??硫붿씤硫붾돱瑜?議고쉶?쒕떎.
     * @param model
     * @return	"/uss/sam/cpy/"
     * @throws Exception
     */
    @RequestMapping(value="/uss/olp/mgt/EgovMain.do")
    public String egovMain(ModelMap model) throws Exception {
    	return "egovframework/com/uss/olp/mgt/EgovMain";
    }

    /**
     * 硫붾돱瑜?議고쉶?쒕떎.
     * @param model
     * @return	"/uss/sam/cpy/EgovLeft"
     * @throws Exception
     */
    @RequestMapping(value="/uss/olp/mgt/EgovLeft.do")
    public String egovLeft(ModelMap model) throws Exception {
    	return "egovframework/com/uss/olp/mgt/EgovLeft";
    }

    /**
     * 遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
     * @param searchVO
     * @param commandMap
     * @param model
     * @return "egovframework/com/uss/olp/mgt/EgovMeetingManageLisEmpLyrPopup"
     * @throws Exception
     */
    @RequestMapping(value="/uss/olp/mgt/EgovMeetingManageLisAuthorGroupPopup.do")
	public String egovMeetingManageLisAuthorGroupPopupPost (
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {

    	 List<EgovMap> resultList = egovMeetingManageService.egovMeetingManageLisAuthorGroupPopup(searchVO);
         model.addAttribute("resultList", resultList);

    	return "egovframework/com/uss/olp/mgt/EgovMeetingManageLisAuthorGroupPopup";
    }

    /**
     * ?뚯썝紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @param commandMap
     * @param model
     * @return  "/uss/olp/mgt/EgovMeetingManageLisEmpLyrPopup"
     * @throws Exception
     */
    @RequestMapping(value="/uss/olp/mgt/EgovMeetingManageLisEmpLyrPopup.do")
	public String egovMeetingManageLisEmpLyrPopupPost (
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {

    	 List<EgovMap> resultList = egovMeetingManageService.egovMeetingManageLisEmpLyrPopup(searchVO);
         model.addAttribute("resultList", resultList);

    	return "egovframework/com/uss/olp/mgt/EgovMeetingManageLisEmpLyrPopup";
    }

	/**
	 * ?뚯쓽?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param meetingManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/mgt/EgovMeetingManageList"
	 * @throws Exception
	 */
    @IncludedInfo(name="?뚯쓽愿由?, order = 650 ,gid = 50)
	@RequestMapping(value="/uss/olp/mgt/EgovMeetingManageList.do")
	public String egovMeetingManageList(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			MeetingManageVO meetingManageVO,
    		ModelMap model)
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

        List<EgovMap> sampleList = egovMeetingManageService.selectMeetingManageList(searchVO);
        model.addAttribute("resultList", sampleList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String)commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String)commandMap.get("searchCondition"));

        int totCnt = egovMeetingManageService.selectMeetingManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/mgt/EgovMeetingManageList";

	}

	/**
	 * ?뚯쓽?뺣낫 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * @param searchVO
	 * @param meetingManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/mgt/EgovMeetingManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value="/uss/olp/mgt/EgovMeetingManageDetail.do")
	public String egovMeetingManageDetail(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			MeetingManageVO meetingManageVO,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/mgt/EgovMeetingManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
		if(sCmd.equals("del")){
			egovMeetingManageService.deleteMeetingManage(meetingManageVO);
			sLocationUrl = "redirect:/uss/olp/mgt/EgovMeetingManageList.do";
		}else{
			List<EgovMap> sampleList = egovMeetingManageService.selectMeetingManageDetail(meetingManageVO);
        	model.addAttribute("resultList", sampleList);
		}

		return sLocationUrl;
	}

	/**
	  * ?뚯쓽?뺣낫瑜??섏젙?쒕떎.
	 * @param searchVO
	 * @param meetingManageVO
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/mgt/EgovMeetingManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value="/uss/olp/mgt/EgovMeetingManageModify.do")
	public String meetingManageModify(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@Valid @ModelAttribute("meetingManageVO") MeetingManageVO meetingManageVO,
			BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {

    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/olp/mgt/EgovMeetingManageModify";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

        if(sCmd.equals("save")){
    		if(bindingResult.hasErrors()){
                List<EgovMap> resultList = egovMeetingManageService.selectMeetingManageDetail(meetingManageVO);
                model.addAttribute("resultList", resultList);
    			return sLocationUrl;
    		}
    		//?꾩씠???ㅼ젙
        	meetingManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
        	meetingManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        	egovMeetingManageService.updateMeetingManage(meetingManageVO);
        	sLocationUrl = "redirect:/uss/olp/mgt/EgovMeetingManageList.do";
        }else{
            List<EgovMap> resultList = egovMeetingManageService.selectMeetingManageDetail(meetingManageVO);
            model.addAttribute("resultList", resultList);
        }

		return sLocationUrl;
	}

	/**
	 * ?뚯쓽?뺣낫瑜??깅줉?쒕떎.
	 * @param searchVO
	 * @param meetingManageVO
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/mgt/EgovMeetingManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value="/uss/olp/mgt/EgovMeetingManageRegist.do")
	public String meetingManageRegist(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@Valid @ModelAttribute("meetingManageVO") MeetingManageVO meetingManageVO,
			BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/olp/mgt/EgovMeetingManageRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

        if(sCmd.equals("save")){
    		if(bindingResult.hasErrors()){
    			return sLocationUrl;
    		}
    		//?꾩씠???ㅼ젙
        	meetingManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
        	meetingManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

        	egovMeetingManageService.insertMeetingManage(meetingManageVO);
        	sLocationUrl = "redirect:/uss/olp/mgt/EgovMeetingManageList.do";
        }

		return sLocationUrl;
	}

}
