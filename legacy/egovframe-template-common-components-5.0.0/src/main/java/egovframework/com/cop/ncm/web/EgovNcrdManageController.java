package egovframework.com.cop.ncm.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.ncm.service.EgovNcrdManageService;
import egovframework.com.cop.ncm.service.NameCard;
import egovframework.com.cop.ncm.service.NameCardUser;
import egovframework.com.cop.ncm.service.NameCardVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 紐낇븿?뺣낫瑜?愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.3.30  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *   2022.11.11 源?쒖?          ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Controller
public class EgovNcrdManageController {

    @Resource(name = "EgovNcrdManageService")
    private EgovNcrdManageService ncrdService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    //Logger log = Logger.getLogger(this.getClass());

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param ncrdVO
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="紐낇븿愿由?,order = 370 ,gid = 40)
    @RequestMapping("/cop/ncm/selectNcrdInfs.do")
    public String selectNcrdItems(@ModelAttribute("searchVO") NameCardVO ncrdVO, SessionStatus status, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		 // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		ncrdVO.setPageUnit(propertyService.getInt("pageUnit"));
		ncrdVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(ncrdVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ncrdVO.getPageUnit());
		paginationInfo.setPageSize(ncrdVO.getPageSize());

		ncrdVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ncrdVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ncrdVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		ncrdVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		Map<String, Object> map = ncrdService.selectNcrdItems(ncrdVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("uniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/ncm/EgovNcrdList";
    }

    /**
     * 紐낇븿 ?뺣낫瑜???젣?쒕떎.
     *
     * @param nameCard
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */

    @RequestMapping("/cop/ncm/deleteNcrdInf.do")
    public String deleteNcrdItem(@ModelAttribute("searchVO") NameCardVO ncrdVO, SessionStatus status,
	    ModelMap model) throws Exception {

	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	 // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
    if(!isAuthenticated) {
        return "redirect:/uat/uia/egovLoginUsr.do";
    }

	ncrdVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

	// 2022.11.11 ?쒗걧?댁퐫??泥섎━
	ncrdService.deleteNcrdItem(ncrdVO);

	return "forward:/cop/ncm/selectNcrdInfs.do";
    }

    /**
     * 紐낇븿 ?뺣낫 ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
     *
     * @param nameCard
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/addNcrdInf.do")
    public String addNcrdItem(@ModelAttribute("searchVO") NameCardVO ncrdVO, SessionStatus status, ModelMap model) throws Exception {
    	return "egovframework/com/cop/ncm/EgovNcrdRegist";
    }

    /**
     * 紐낇븿 ?뺣낫瑜??깅줉?쒕떎.
     *
     * @param nameCard
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/insertNcrdInf.do")
    public String insertNcrdItem(@ModelAttribute("searchVO") NameCardVO ncrdVO, @Valid @ModelAttribute("nameCard") NameCard nameCard,
	    BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		 // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		if (bindingResult.hasErrors()) {
		    return "egovframework/com/cop/ncm/EgovNcrdRegist";
		}

		nameCard.setAdres(nameCard.getZipCode() + " " + nameCard.getAdres());
		nameCard.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		ncrdService.insertNcrdItem(nameCard);

		return "forward:/cop/ncm/selectMyNcrdUseInf.do";
    }

    /**
     * 紐낇븿 ?뺣낫??????곸꽭?뺣낫瑜?議고쉶?쒕떎
     *
     * @param nameCard
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/selectNcrdInf.do")
    public String selectNcrdItem(@ModelAttribute("searchVO") NameCardVO ncrdVO, SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		ncrdVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		NameCardVO vo = ncrdService.selectNcrdItem(ncrdVO);

		model.addAttribute("ncrdVO", vo);

		return "egovframework/com/cop/ncm/EgovNcrdUpdt";
    }

    /**
     * 紐낇븿 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @param nameCard
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/updateNcrdInf.do")
    public String updateNcrdItem(@ModelAttribute("searchVO") NameCardVO ncrdVO, @RequestParam("ncrdNm") String ncrdNm,
	    @Valid @ModelAttribute("nameCard") NameCard nameCard, BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		if (bindingResult.hasErrors()) {
		    ncrdVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    NameCardVO vo  = ncrdService.selectNcrdItem(ncrdVO);

		    model.addAttribute("ncrdVO", vo);

		    return "egovframework/com/cop/ncm/EgovNcrdUpdt";
		}

		if (!"".equals(nameCard.getZipCode())) {
		    nameCard.setAdres(nameCard.getZipCode() + " " + nameCard.getAdres());
		}

		nameCard.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		ncrdService.updateNcrdItem(nameCard);

		return "forward:/cop/ncm/selectMyNcrdUseInf.do";
    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     *
     * @param ncrdUser
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/insertNcrdUseInf.do")
    public String insertNcrdUseInf(@ModelAttribute("ncrdUser") NameCardUser ncrdUser, @ModelAttribute("ncrdVO") NameCardVO ncrdVO,
	    SessionStatus status, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		 // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		ncrdUser.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		ncrdUser.setUseAt("Y");

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		ncrdService.insertNcrdUseInf(ncrdUser);

		return "forward:/cop/ncm/selectMyNcrdUseInf.do";
    }

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param ncrdUser
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="?대챸?⑤ぉ濡?,order = 371 ,gid = 40)
    @RequestMapping("/cop/ncm/selectMyNcrdUseInf.do")
    public String selectNcrdUseInf(@ModelAttribute("searchVO") NameCardUser ncrdUser, SessionStatus status, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		 // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		ncrdUser.setPageUnit(propertyService.getInt("pageUnit"));
		ncrdUser.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(ncrdUser.getPageIndex());
		paginationInfo.setRecordCountPerPage(ncrdUser.getPageUnit());
		paginationInfo.setPageSize(ncrdUser.getPageSize());

		ncrdUser.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ncrdUser.setLastIndex(paginationInfo.getLastRecordIndex());
		ncrdUser.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		ncrdUser.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		Map<String, Object> map = ncrdService.selectNcrdUseInfs(ncrdUser);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("uniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/ncm/EgovMyNcrdList";
    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??섏젙?쒕떎.
     *
     * @param ncrdUser
     * @param sessionVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/updateNcrdUseInf.do")
    public String updateNcrdUseInf(@ModelAttribute("ncrdUser") NameCardUser ncrdUser, @ModelAttribute("ncrdVO") NameCardVO ncrdVO,
	    SessionStatus status, ModelMap model) throws Exception {
		@SuppressWarnings("unused")
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		ncrdUser.setUseAt("N");

		if (isAuthenticated) {
		    ncrdService.updateNcrdUseInf(ncrdUser);
		}

		return "forward:/cop/ncm/selectMyNcrdUseInf.do";
    }

    /**
     * 紐낇븿 ?뺣낫??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param ncrdVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/ncm/selectNcrdInfPopup.do")
    public String selectNcrdItemforPop(@ModelAttribute("searchVO") NameCardVO ncrdVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
	    if(!isAuthenticated) {
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		ncrdVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		NameCardVO vo = ncrdService.selectNcrdItem(ncrdVO);

		model.addAttribute("ncrdVO", vo);

		return "egovframework/com/cop/ncm/EgovNcrdInqirePopup";
    }
}
