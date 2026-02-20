package egovframework.com.cop.cmy.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.EgovArticleService;
import egovframework.com.cop.cmy.service.CommunityUser;
import egovframework.com.cop.cmy.service.CommunityUserVO;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuBBSMasterService;
import egovframework.com.cop.cmy.service.EgovCommuManageService;
import egovframework.com.cop.cmy.service.EgovCommuMasterService;
import egovframework.com.cop.tpl.service.EgovTemplateManageService;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 而ㅻ??덊떚 ?ъ슜?먭?由? 而ㅻ??덊떚 寃뚯떆?먯쓣 愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? 源?고샇
 * @since 2016.08.01
 * @version 3.6
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *   ----------   --------   ---------------------------
 *   2016.06.13   源?고샇            理쒖큹 ?앹꽦 - ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *   2019.05.17   ?좎슜??           KISA 痍⑥빟??議곗튂 諛?蹂댁셿
 *   2022.11.11   源?쒖?            ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Controller
public class EgovCommuManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovCommuManageController.class);

	@Resource(name = "EgovCommuManageService")
    private EgovCommuManageService egovCommuManageService;

	@Resource(name = "EgovCommuBBSMasterService")
	private EgovCommuBBSMasterService egovCommuBBSMasterService;

	@Resource(name = "EgovCommuMasterService")
	private EgovCommuMasterService egovCommuMasterService;

	@Resource(name = "EgovArticleService")
	private EgovArticleService egovArticleService;

	@Resource(name = "EgovTemplateManageService")
	private EgovTemplateManageService egovTemplateManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    /** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
     * 而ㅻ??덊떚 硫붿씤?섏씠吏瑜?議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/cmmntyMain.do")
    public String selectCmmntyMain(@ModelAttribute("searchVO") CommunityVO cmmntyVO
    		,ModelMap model
    		,HttpServletRequest request) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        cmmntyVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

        // 2022.11.11 ?쒗걧?댁퐫??泥섎━
		Map<String, Object> map = egovCommuManageService.selectCommuInf(cmmntyVO);
		model.addAttribute("cmmntyVO", map.get("cmmntyVO"));
		model.addAttribute("cmmntyUser", map.get("cmmntyUser"));

		//--------------------------------
		// 寃뚯떆??紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		BoardMasterVO bbsVo = new BoardMasterVO();

		bbsVo.setCmmntyId(cmmntyVO.getCmmntyId());

		List<BoardMasterVO> bbsResult = egovCommuBBSMasterService.selectCommuBBSMasterListMain(bbsVo);

		model.addAttribute("bbsList", bbsResult);
		////------------------------------
		//		221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
		model.addAttribute("isAuthenticated", "Y");
		model.addAttribute("returnMsg", request.getParameter("returnMsg"));

		return "egovframework/com/cop/cmy/EgovCommuMain";
    }

    /**
     * 而ㅻ??덊떚 硫붿씤?섏씠吏??湲곕낯 ?댁슜(寃뚯떆??4媛??쒖떆) 議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/cmmntyMainContents.do")
    public String selectCmmntyMainContents(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		cmmntyVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		//--------------------------------
		// 寃뚯떆??紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		BoardMasterVO bbsVo = new BoardMasterVO();

		bbsVo.setCmmntyId(cmmntyVO.getCmmntyId());

		List<BoardMasterVO> bbsResult = egovCommuBBSMasterService.selectCommuBBSMasterListMain(bbsVo);

		// 諛⑸챸濡??쒖쇅 泥섎━
		for (int i = 0; i < bbsResult.size(); i++) {
		    if ("BBST04".equals(bbsResult.get(i).getBbsTyCode())) {
			bbsResult.remove(i);
		    }
		}

		model.addAttribute("bbsList", bbsResult);

		//--------------------------------
		// 寃뚯떆臾?紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		BoardVO boardVo = null;
		BoardMasterVO masterVo = null;

		ArrayList<Object> target = new ArrayList<>();	// Object => List<BoardVO>
		for (int i = 0; i < bbsResult.size() && i < 4; i++) {
		    masterVo = bbsResult.get(i);
		    boardVo = new BoardVO();

		    boardVo.setBbsId(masterVo.getBbsId());
		    boardVo.setBbsNm(masterVo.getBbsNm());

		    boardVo.setPageUnit(4);
		    boardVo.setPageSize(4);

		    boardVo.setFirstIndex(0);
		    boardVo.setRecordCountPerPage(4);

		    Map<String, Object> map = egovArticleService.selectArticleList(boardVo);

		    target.add(map.get("resultList"));
		}

		model.addAttribute("articleList", target);

		return "egovframework/com/cop/cmy/EgovCmmntyBaseTmplContents";
    }

    /**
     * 而ㅻ??덊떚 媛?낆떊泥?쓣 ?깅줉?쒕떎.
     *
     * @param cmmntyUser
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/insertCommuUserBySelf.do")
    public String insertCmmntyUserBySelf(@ModelAttribute("cmmntyUser") CommunityUser cmmntyUser, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		//KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		String retVal = "";

		if ("".equals(cmmntyUser.getMngrAt())) {
		    cmmntyUser.setMngrAt("N");
		}
		cmmntyUser.setUseAt("Y");
		cmmntyUser.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		cmmntyUser.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		cmmntyUser.setMberSttus("A");

	    // ?뱀씤?붿껌 泥섎━
	    retVal = egovCommuManageService.checkCommuUserDetail(cmmntyUser);

	    //?붿껌嫄댁씠 ?놁쓣 寃쎌슦
	    if (!retVal.equals("EXIST")) {
			egovCommuManageService.insertCommuUserRqst(cmmntyUser);
			retVal = egovMessageSource.getMessage("comCopCmy.commuMain.joinMember.info.success"); //媛?낆떊泥?씠 ?뺤긽泥섎━?섏뿀?듬땲??
	    } else {
	    	retVal = egovMessageSource.getMessage("comCopCmy.commuMain.joinMember.info.fail"); //?대? 媛?낆쿂由ш? ?섏뼱 ?덉뒿?덈떎.
	    }

		model.addAttribute("returnMsg", retVal);
		model.addAttribute("cmmntyId", cmmntyUser.getCmmntyId());

		return "redirect:/cop/cmy/cmmntyMain.do";
    }

    /**
     * 而ㅻ??덊떚瑜??덊눜?쒕떎.
     *
     * @param cmmntyUser
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/deleteCommuUserBySelf.do")
    public String deleteCmmntyUserBySelf(@ModelAttribute("cmmntyUser") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		//KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		//濡쒓렇?명븳 ?ъ슜?먭? 愿由ъ옄?몄? ?뺤씤?쒕떎.
		CommunityUserVO userVO = new CommunityUserVO();
		userVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		userVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		Boolean isCommuAdmin = egovCommuManageService.selectIsCommuAdmin(userVO);

		//愿由ъ옄???덊눜?????놁쓬.
		String resultMsg = "";
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if(!isCommuAdmin) {
			cmmntyUserVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			egovCommuManageService.deleteCommuUser(cmmntyUserVO);
			resultMsg = egovMessageSource.getMessage("comCopCmy.commuMain.deleteMember.info.success"); //?덊눜?좎껌???뺤긽泥섎━?섏뿀?듬땲??
		} else {
			resultMsg = egovMessageSource.getMessage("comCopCmy.commuMain.deleteMember.info.admin"); //愿由ъ옄???덊눜?좎닔 ?놁뒿?덈떎.
		}

		model.addAttribute("cmmntyId", cmmntyUserVO.getCmmntyId());
		model.addAttribute("returnMsg", resultMsg);

		return "redirect:/cop/cmy/cmmntyMain.do";
    }

    /**
     * 而ㅻ??덊떚 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
     *
     * @param cmmntyUserVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/selectCommuUserList.do")
    public String selectCommuUserList(@ModelAttribute("searchVO") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {
		cmmntyUserVO.setPageUnit(propertyService.getInt("pageUnit"));
		cmmntyUserVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(cmmntyUserVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(cmmntyUserVO.getPageUnit());
		paginationInfo.setPageSize(cmmntyUserVO.getPageSize());

		cmmntyUserVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		cmmntyUserVO.setLastIndex(paginationInfo.getLastRecordIndex());
		cmmntyUserVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovCommuManageService.selectCommuUserList(cmmntyUserVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/cmy/EgovCommuUserList";
    }

    /**
     * 而ㅻ??덊떚 ?ъ슜?먮? ?깅줉?쒕떎.
     *
     * @param cmmntyUserVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/insertCommuUser.do")
    public String insertCommuUser(@ModelAttribute("searchVO") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		//濡쒓렇?명븳 ?ъ슜?먭? 愿由ъ옄?몄? ?뺤씤?쒕떎.
		CommunityUserVO userVO = new CommunityUserVO();
		userVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		userVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		Boolean isCommuAdmin = egovCommuManageService.selectIsCommuAdmin(userVO);

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if(isCommuAdmin) {
			cmmntyUserVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			egovCommuManageService.insertCommuUser(cmmntyUserVO);
		}

		return "forward:/cop/cmy/selectCommuUserList.do";
    }

    /**
     * 而ㅻ??덊떚 ?ъ슜?먮? ?덊눜?쒗궓?? (媛?낃굅???ы븿)
     *
     * @param cmmntyUserVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/deleteCommuUser.do")
    public String deleteCommuUser(@ModelAttribute("searchVO") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		//濡쒓렇?명븳 ?ъ슜?먭? 愿由ъ옄?몄? ?뺤씤?쒕떎.
		CommunityUserVO userVO = new CommunityUserVO();
		userVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		userVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		Boolean isCommuAdmin = egovCommuManageService.selectIsCommuAdmin(userVO);

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if(isCommuAdmin) {
			egovCommuManageService.deleteCommuUser(cmmntyUserVO);
		}

		return "forward:/cop/cmy/selectCommuUserList.do";
    }

    /**
     * 而ㅻ??덊떚 愿由ъ옄瑜??깅줉?쒕떎.
     *
     * @param cmmntyUserVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/insertCommuUserAdmin.do")
    public String insertCommuUserAdmin(@ModelAttribute("searchVO") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		//濡쒓렇?명븳 ?ъ슜?먭? 愿由ъ옄?몄? ?뺤씤?쒕떎.
		CommunityUserVO userVO = new CommunityUserVO();
		userVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		userVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		Boolean isCommuAdmin = egovCommuManageService.selectIsCommuAdmin(userVO);

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if(isCommuAdmin) {
			cmmntyUserVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			egovCommuManageService.insertCommuUserAdmin(cmmntyUserVO);
		}

		return "forward:/cop/cmy/selectCommuUserList.do";
    }

    /**
     * 而ㅻ??덊떚 愿由ъ옄瑜??댁젣?쒕떎.
     *
     * @param cmmntyUserVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/deleteCommuUserAdmin.do")
    public String deleteCommuUserAdmin(@ModelAttribute("searchVO") CommunityUserVO cmmntyUserVO, ModelMap model) throws Exception {

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		//濡쒓렇?명븳 ?ъ슜?먭? 愿由ъ옄?몄? ?뺤씤?쒕떎.
		CommunityUserVO userVO = new CommunityUserVO();
		userVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		userVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		Boolean isCommuAdmin = egovCommuManageService.selectIsCommuAdmin(userVO);

		//而ㅻ??덊떚 媛쒖꽕?먮뒗 愿由ъ옄?댁젣瑜??????놁쓬.
		CommunityVO cmmntyVO = new CommunityVO();
		cmmntyVO.setCmmntyId(cmmntyUserVO.getCmmntyId());
		cmmntyVO = egovCommuMasterService.selectCommuMaster(cmmntyVO);
		//而ㅻ??덊떚 理쒖큹?깅줉?먮? ?뺤씤?쒕떎. ?쇱튂??寃쎌슦 愿由ъ옄 ?댁젣 遺덇?.
		if(cmmntyVO.getFrstRegisterId().equals(cmmntyUserVO.getEmplyrId())) {
			return "forward:/cop/cmy/selectCommuUserList.do";
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if(isCommuAdmin) {
			cmmntyUserVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			egovCommuManageService.deleteCommuUserAdmin(cmmntyUserVO);
		}

		return "forward:/cop/cmy/selectCommuUserList.do";
    }

    /**
     * 誘몃━蹂닿린 而ㅻ??덊떚 硫붿씤?섏씠吏瑜?議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/previewCmmntyMainPage.do")
    public String previewCmmntyMainPage(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		cmmntyVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		String tmplatCours = cmmntyVO.getSearchWrd();

		CommunityVO vo = new CommunityVO();

		vo.setCmmntyNm("誘몃━蹂닿린 而ㅻ??덊떚");
		vo.setCmmntyIntrcn("誘몃━蹂닿린瑜??꾪븳 而ㅻ??덊떚?낅땲??");
		vo.setUseAt("Y");
		vo.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));	// 蹂몄씤

		CommunityUser cmmntyUser = new CommunityUser();

		cmmntyUser.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		cmmntyUser.setEmplyrNm("愿由ъ옄");

		model.addAttribute("cmmntyVO", vo);
		model.addAttribute("cmmntyUser", cmmntyUser);

		//--------------------------------
		// 寃뚯떆??紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		List<BoardMasterVO> bbsResult = new ArrayList<>();

		BoardMasterVO target = null;

		target = new BoardMasterVO();
		target.setBbsNm("諛⑸챸濡?);
		bbsResult.add(target);

		target = new BoardMasterVO();
		target.setBbsNm("怨듭?寃뚯떆??);
		bbsResult.add(target);

		target = new BoardMasterVO();
		target.setBbsNm("媛ㅻ윭由?);
		bbsResult.add(target);

		target = new BoardMasterVO();
		target.setBbsNm("?먯쑀寃뚯떆??);
		bbsResult.add(target);

		target = new BoardMasterVO();
		target.setBbsNm("?먮즺??);
		bbsResult.add(target);

		model.addAttribute("bbsList", bbsResult);
		////------------------------------

		if (isAuthenticated) {
		    model.addAttribute("isAuthenticated", "Y");
		} else {
		    model.addAttribute("isAuthenticated", "N");
		}

		model.addAttribute("preview", "true");

		// ?덉쟾??寃쎈줈 臾몄옄?대줈 議곗튂
		tmplatCours = EgovWebUtil.filePathBlackList(tmplatCours);

		// ?붿씠??由ъ뒪??泥댄겕
		List<TemplateInfVO> templateWhiteList = egovTemplateManageService.selectTemplateWhiteList();
		LOGGER.debug("Template > WhiteList Count = {}",templateWhiteList.size());
		if ( tmplatCours == null ) {
			tmplatCours = "";
		}
		for(TemplateInfVO templateInfVO : templateWhiteList){
			LOGGER.debug("Template > whiteList TmplatCours = "+templateInfVO.getTmplatCours());
            if ( tmplatCours.equals(templateInfVO.getTmplatCours()) ) {
            	return tmplatCours;
            }
        }

		LOGGER.debug("Template > WhiteList mismatch! Please check Admin page!");
		return "egovframework/com/cmm/egovError";
    }

    /**
     * 而ㅻ??덊떚 硫붿씤?섏씠吏??湲곕낯 ?댁슜(寃뚯떆??4媛??쒖떆) 議고쉶?쒕떎.
     *
     * @param cmmntyVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmy/previewCmmntyMainContents.do")
    public String previewCmmntyMainContents(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		@SuppressWarnings("unused")
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		cmmntyVO.setEmplyrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		//--------------------------------
		// 寃뚯떆??紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		List<BoardMasterVO> bbsResult = new ArrayList<>();

		BoardMasterVO master = null;

		master = new BoardMasterVO();
		master.setBbsNm("怨듭?寃뚯떆??);
		bbsResult.add(master);

		master = new BoardMasterVO();
		master.setBbsNm("媛ㅻ윭由?);
		bbsResult.add(master);

		master = new BoardMasterVO();
		master.setBbsNm("?먯쑀寃뚯떆??);
		bbsResult.add(master);

		master = new BoardMasterVO();
		master.setBbsNm("?먮즺??);
		bbsResult.add(master);

		model.addAttribute("bbsList", bbsResult);

		//--------------------------------
		// 寃뚯떆臾?紐⑸줉 ?뺣낫 泥섎━
		//--------------------------------
		ArrayList<Object> target = new ArrayList<>();	// Object => List<BoardVO>
		for (int i = 0; i < bbsResult.size() && i < 4; i++) {

		    target.add(null);
		}

		model.addAttribute("boardList", target);

		model.addAttribute("preview", "true");

		return "egovframework/com/cop/tpl/EgovCmmntyBaseTmplContents";
    }

}
