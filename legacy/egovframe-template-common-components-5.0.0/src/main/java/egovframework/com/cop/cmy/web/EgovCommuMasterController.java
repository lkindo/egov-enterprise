package egovframework.com.cop.cmy.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityUserVO;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuManageService;
import egovframework.com.cop.cmy.service.EgovCommuMasterService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * 而ㅻ??덊떚 ?뺣낫瑜?愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *   -------       --------    ---------------------------
 *   2009.4.2	?댁궪??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *   2011.9.7	?뺤쭊??		而ㅻ??덊떚 ?덊눜 ?붿껌???뺤긽?곸쑝濡??대쨪吏吏 ?딆? ?ы빆 ?섏젙??
 *   							而ㅻ??덊떚 ?덊눜 ?붿껌???뱀씤?먮? ?좏깮?섎?濡??덊눜 ?뱀씤?먭? ?먯떊???????놁쓬?먮룄
 *   							?몄뀡?먯꽌 媛?몄삩 媛??덊눜?좎껌?????덊눜?뱀씤?먮줈 ?ㅼ젙?섎룄濡??섏뼱 ?덉뿀??
 *   2016.06.13 源?고샇          ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *   2022.11.11 源?쒖?          ?쒗걧?댁퐫??泥섎━
 * </pre>
 */

@Controller
public class EgovCommuMasterController {

    @Resource(name = "EgovCommuMasterService")
    private EgovCommuMasterService egovCommuMasterService;

    @Resource(name = "EgovCommuManageService")
    private EgovCommuManageService egovCommuManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    //Logger log = Logger.getLogger(this.getClass());

	/**
     * 而ㅻ??덊떚?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="而ㅻ??덊떚愿由?, order = 270 ,gid = 40)
    @RequestMapping("/cop/cmy/selectCommuMasterList.do")
    public String selectCommuMasterList(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {
	cmmntyVO.setPageUnit(propertyService.getInt("pageUnit"));
	cmmntyVO.setPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();

	paginationInfo.setCurrentPageNo(cmmntyVO.getPageIndex());
	paginationInfo.setRecordCountPerPage(cmmntyVO.getPageUnit());
	paginationInfo.setPageSize(cmmntyVO.getPageSize());

	cmmntyVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
	cmmntyVO.setLastIndex(paginationInfo.getLastRecordIndex());
	cmmntyVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = egovCommuMasterService.selectCommuMasterList(cmmntyVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("paginationInfo", paginationInfo);

	return "egovframework/com/cop/cmy/EgovCommuMasterList";
    }

    /**
     * 而ㅻ??덊떚 ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
     *
     * @param cmmntyVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/insertCommuMasterView.do")
    public String insertCommuMasterView(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {
    	model.addAttribute("commuMasterVO", new CommunityVO());

	return "egovframework/com/cop/cmy/EgovCommuMasterRegist";
    }

    /**
     * 而ㅻ??덊떚 ?뺣낫瑜??깅줉?쒕떎.
     *
     * @param cmmntyVO
     * @param cmmnty
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/insertCommuMaster.do")
    public String insertCommuMaster(@ModelAttribute("searchVO") CommunityVO cmmntyVO, @Valid @ModelAttribute("commuMaster") Community community,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		if (bindingResult.hasErrors()) {
		    return "egovframework/com/cop/cmy/EgovCommuMasterRegist";
		}

		community.setRegistSeCode("REGC02");
		community.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		String cmmntyId = egovCommuMasterService.insertCommuMaster(community);

	    //而ㅻ??덊떚 媛쒖꽕?먯쓽 ?뺣낫瑜??깅줉?쒕떎.
	    CommunityUserVO cmmntyUserVO = new CommunityUserVO();
	    cmmntyUserVO.setCmmntyId(cmmntyId);
	    cmmntyUserVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
	    cmmntyUserVO.setMngrAt("Y");
	    cmmntyUserVO.setMberSttus("P");
	    cmmntyUserVO.setUseAt("Y");
	    cmmntyUserVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

	    egovCommuManageService.insertCommuUserRqst(cmmntyUserVO);

		return "forward:/cop/cmy/selectCommuMasterList.do";
    }

    /**
     * 而ㅻ??덊떚??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/selectCommuMasterDetail.do")
    public String selectCommuMasterDetail(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model, HttpServletRequest request) throws Exception {
		CommunityVO result = egovCommuMasterService.selectCommuMaster(cmmntyVO);

		//-----------------------
		// ?쒓났 URL
		//-----------------------
		result.setProvdUrl(request.getContextPath()+ "/cop/cmy/CommuMainPage.do?cmmntyId=" + result.getCmmntyId());
		////---------------------

		model.addAttribute("result", result);

		return "egovframework/com/cop/cmy/EgovCommuMasterDetail";
    }

    /**
     * 而ㅻ??덊떚 ?뺣낫 ?섏젙???꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
     *
     * @param cmmntyVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/updateCommuMasterView.do")
    public String updateCommuMasterView(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model)
	    throws Exception {

		CommunityVO result = egovCommuMasterService.selectCommuMaster(cmmntyVO);

		model.addAttribute("commuMasterVO", result);

		return "egovframework/com/cop/cmy/EgovCommuMasterUpdt";
    }

    /**
     * 而ㅻ??덊떚 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @param cmmntyVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/updateCommuMaster.do")
    public String updateCommuMaster(@ModelAttribute("searchVO") CommunityVO cmmntyVO, @Valid @ModelAttribute("commuMaster") Community community,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		if (bindingResult.hasErrors()) {

		    CommunityVO result = egovCommuMasterService.selectCommuMaster(cmmntyVO);
		    model.addAttribute("result", result);

		    return "egovframework/com/cop/cmy/EgovCommuMasterUpdt";
		}

		community.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		egovCommuMasterService.updateCommuMaster(community);

		return "forward:/cop/cmy/selectCommuMasterList.do";
    }

    /**
     * 而ㅻ??덊떚 ?뺣낫瑜???젣?쒕떎.
     *
     * @param cmmntyVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/deleteCommuMaster.do")
    public String deleteCommuMaster(@ModelAttribute("searchVO") CommunityVO cmmntyVO, @ModelAttribute("commuMaster") Community community,
	    BindingResult bindingResult, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

    	if (isAuthenticated) {
    		community.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
    	    egovCommuMasterService.deleteBBSMasterInf(community);
    	}
    	return "forward:/cop/cmy/selectCommuMasterList.do";
        }

    /**
     * ?ы듃由우쓣 ?꾪븳 而ㅻ??덊떚 ?뺣낫 紐⑸줉 ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/selectCommuMasterListPortlet.do")
    public String selectCmmntyListPortlet(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {
	List<CommunityVO> result = egovCommuMasterService.selectCommuMasterListPortlet(cmmntyVO);

	model.addAttribute("resultList", result);

	return "egovframework/com/cop/cmy/EgovCommuMasterListPortlet";
    }
}
