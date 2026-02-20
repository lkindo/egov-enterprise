package egovframework.com.cop.stf.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.EgovBBSSatisfactionService;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 留뚯”???쒕퉬??而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.29  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * Copyright (C) 2009 by MOPAS  All right reserved.
 * </pre>
 */
@Controller
public class EgovBBSSatisfactionController {

	@Resource(name="EgovBBSSatisfactionService")
    protected EgovBBSSatisfactionService bbsSatisfactionService;

    @Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    //Logger log = Logger.getLogger(this.getClass());

    /**
     * 留뚯”?꾩“??紐⑸줉 議고쉶瑜??쒓났?쒕떎.
     *
     * @param boardVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/selectSatisfactionList.do")
    public String selectSatisfactionList(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model) throws Exception {

	// ?섏젙 泥섎━????留뚯”?꾩“???깅줉 ?붾㈃?쇰줈 泥섎━?섍린 ?꾪븳 援ы쁽
	if (satisfactionVO.isModified()) {
	    satisfactionVO.setStsfdgNo("");
	    satisfactionVO.setStsfdgCn("");
	    satisfactionVO.setStsfdg(0);
	}

	// ?섏젙???꾪븳 泥섎━
	if (!satisfactionVO.getStsfdgNo().equals("")) {
	    return "forward:/cop/stf/selectSingleSatisfaction.do";
	}

	//------------------------------------------
	// JSP??<head> 遺遺?泥섎━ (javascript ?앹꽦)
	//------------------------------------------
	model.addAttribute("type", satisfactionVO.getType());	// head or body

	if (satisfactionVO.getType().equals("head")) {
	    return "egovframework/com/cop/stf/EgovSatisfactionList";
	}
	////----------------------------------------

	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

	satisfactionVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

	satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
	satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();
	paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
	paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
	paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

	satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
	satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
	satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = bbsSatisfactionService.selectSatisfactionList(satisfactionVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("summary", map.get("summary"));
	model.addAttribute("paginationInfo", paginationInfo);

	satisfactionVO.setStsfdgCn("");	// ?깅줉 ??留뚯”???댁슜 泥섎━
	satisfactionVO.setStsfdg(0);	// ?깅줉 ??留뚯”??泥섎━

	return "egovframework/com/cop/stf/EgovSatisfactionList";
    }

    /**
     * ?듬챸??留뚯”?꾩“??紐⑸줉 議고쉶瑜??쒓났?쒕떎.
     *
     * @param boardVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/anonymous/selectSatisfactionList.do")
    public String selectAnonymousSatisfactionList(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model) throws Exception {

	// ?섏젙 泥섎━????留뚯”?꾩“???깅줉 ?붾㈃?쇰줈 泥섎━?섍린 ?꾪븳 援ы쁽
	if (satisfactionVO.isModified()) {
	    satisfactionVO.setStsfdgNo("");
	    satisfactionVO.setStsfdgCn("");
	    satisfactionVO.setStsfdg(0);
	    satisfactionVO.setWrterNm("");
	}

	// ?섏젙???꾪븳 泥섎━
	if (!satisfactionVO.getStsfdgNo().equals("")) {
	    return "forward:/cop/stf/anonymous/selectSingleSatisfaction.do";
	}

	//------------------------------------------
	// JSP??<head> 遺遺?泥섎━ (javascript ?앹꽦)
	//------------------------------------------
	model.addAttribute("type", satisfactionVO.getType());	// head or body

	if (satisfactionVO.getType().equals("head")) {
	    return "egovframework/com/cop/stf/EgovSatisfactionList";
	}
	////----------------------------------------

	model.addAttribute("anonymous", "true");

	satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
	satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();
	paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
	paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
	paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

	satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
	satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
	satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = bbsSatisfactionService.selectSatisfactionList(satisfactionVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("summary", map.get("summary"));
	model.addAttribute("paginationInfo", paginationInfo);

	satisfactionVO.setWrterNm("");
	satisfactionVO.setStsfdgCn("");	// ?깅줉 ??留뚯”???댁슜 泥섎━
	satisfactionVO.setStsfdg(0);	// ?깅줉 ??留뚯”??泥섎━

	return "egovframework/com/cop/stf/EgovSatisfactionList";
    }

    /**
     * 留뚯”?꾩“?щ? ?깅줉?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/insertSatisfaction.do")
    public String insertSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?묒꽦??諛?留뚯”?꾨뒗 ?꾩닔 ?낅젰媛믪엯?덈떎.");

		    return "forward:/cop/bbs/selectBoardArticle.do";
		}

		if (isAuthenticated) {
		    satisfaction.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		    satisfaction.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    satisfaction.setStsfdgPassword("");	// dummy

		    bbsSatisfactionService.insertSatisfaction(satisfaction);

		    satisfactionVO.setStsfdgCn("");
		    satisfactionVO.setStsfdgNo("");
		    satisfactionVO.setStsfdg(0);
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
    }

    /**
     * ?듬챸 留뚯”?꾩“?щ? ?깅줉?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/anonymous/insertSatisfaction.do")
    public String insertAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?묒꽦??諛?留뚯”?꾨뒗 ?꾩닔 ?낅젰媛믪엯?덈떎.");

		    return "forward:/cop/stf/anonymous/selectBoardArticle.do";
		}

		satisfaction.setFrstRegisterId("ANONYMOUS");
		satisfaction.setWrterId("");
		satisfaction.setStsfdgPassword(EgovFileScrty.encryptPassword(satisfaction.getStsfdgPassword(), satisfaction.getStsfdgNo()));

		bbsSatisfactionService.insertSatisfaction(satisfaction);

		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdg(0);
		satisfactionVO.setWrterNm("");

		return "forward:/cop/bbs/anonymous/selectArticleDetail.do";
    }

    /**
     * 留뚯”?꾩“?щ? ??젣?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/deleteSatisfaction.do")
    public String deleteSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @ModelAttribute("satisfaction") Satisfaction satisfaction, ModelMap model) throws Exception {
	@SuppressWarnings("unused")
	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

	if (isAuthenticated) {
	    bbsSatisfactionService.deleteSatisfaction(satisfactionVO);
	}

	satisfactionVO.setStsfdgCn("");
	satisfactionVO.setStsfdgNo("");
	satisfactionVO.setStsfdg(0);

	return "forward:/cop/bbs/selectArticleDetail.do";
    }

    /**
     * ?듬챸 留뚯”?꾩“?щ? ??젣?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/anonymous/deleteSatisfaction.do")
    public String deleteAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @ModelAttribute("satisfaction") Satisfaction satisfaction, ModelMap model) throws Exception {

	//-------------------------------
	// ?⑥뒪?뚮뱶 鍮꾧탳
	//-------------------------------
	String dbpassword = bbsSatisfactionService.getSatisfactionPassword(satisfactionVO);
	String enpassword = EgovFileScrty.encryptPassword(satisfactionVO.getConfirmPassword(), satisfaction.getStsfdgNo());

	if (!dbpassword.equals(enpassword)) {

	    model.addAttribute("subMsg", egovMessageSource.getMessage("cop.password.not.same.msg"));

	    return "forward:/cop/bbs/anonymous/selectArticleDetail.do";
	}
	////-----------------------------

	bbsSatisfactionService.deleteSatisfaction(satisfactionVO);

	satisfactionVO.setStsfdgNo("");
	satisfactionVO.setStsfdgCn("");
	satisfactionVO.setStsfdg(0);
	satisfactionVO.setWrterNm("");

	return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
    }

    /**
     * 留뚯”?꾩“???섏젙 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param satisfactionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/selectSingleSatisfaction.do")
    public String selectSingleSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model) throws Exception {

	//------------------------------------------
	// JSP??<head> 遺遺?泥섎━ (javascript ?앹꽦)
	//------------------------------------------
	model.addAttribute("type", satisfactionVO.getType());	// head or body

	if (satisfactionVO.getType().equals("head")) {
	    return "egovframework/com/cop/stf/EgovSatisfactionList";
	}
	////----------------------------------------

	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	satisfactionVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

	satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
	satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();
	paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
	paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
	paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

	satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
	satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
	satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = bbsSatisfactionService.selectSatisfactionList(satisfactionVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("summary", map.get("summary"));
	model.addAttribute("paginationInfo", paginationInfo);

	Satisfaction data = bbsSatisfactionService.selectSatisfaction(satisfactionVO);

	satisfactionVO.setStsfdgNo(data.getStsfdgNo());
	satisfactionVO.setNttId(data.getNttId());
	satisfactionVO.setBbsId(data.getBbsId());
	satisfactionVO.setWrterId(data.getWrterId());
	satisfactionVO.setWrterNm(data.getWrterNm());
	satisfactionVO.setStsfdgPassword(data.getStsfdgPassword());
	satisfactionVO.setStsfdgCn(data.getStsfdgCn());
	satisfactionVO.setStsfdg(data.getStsfdg());
	satisfactionVO.setUseAt(data.getUseAt());
	satisfactionVO.setFrstRegisterPnttm(data.getFrstRegisterPnttm());
	satisfactionVO.setFrstRegisterNm(data.getFrstRegisterNm());

	return "egovframework/com/cop/stf/EgovSatisfactionList";
    }

    /**
     * ?듬챸 留뚯”?꾩“???섏젙 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param satisfactionVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/anonymous/selectSingleSatisfaction.do")
    public String selectAnonymousSingleSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model) throws Exception {

	//------------------------------------------
	// JSP??<head> 遺遺?泥섎━ (javascript ?앹꽦)
	//------------------------------------------
	model.addAttribute("type", satisfactionVO.getType());	// head or body

	if (satisfactionVO.getType().equals("head")) {
	    return "egovframework/com/cop/stf/EgovSatisfactionList";
	}
	////----------------------------------------

	model.addAttribute("anonymous", "true");

	satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
	satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();
	paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
	paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
	paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

	satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
	satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
	satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = bbsSatisfactionService.selectSatisfactionList(satisfactionVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("summary", map.get("summary"));
	model.addAttribute("paginationInfo", paginationInfo);

	//-------------------------------
	// ?⑥뒪?뚮뱶 鍮꾧탳
	//-------------------------------
	String dbpassword = bbsSatisfactionService.getSatisfactionPassword(satisfactionVO);
	String enpassword = EgovFileScrty.encryptPassword(satisfactionVO.getConfirmPassword(), satisfactionVO.getStsfdgNo());

	if (!dbpassword.equals(enpassword)) {

	    model.addAttribute("subMsg", egovMessageSource.getMessage("cop.password.not.same.msg"));

	    satisfactionVO.setStsfdgNo("");
	    satisfactionVO.setStsfdgCn("");
	    satisfactionVO.setStsfdg(0);
	    satisfactionVO.setWrterNm("");

	} else {

	    Satisfaction data = bbsSatisfactionService.selectSatisfaction(satisfactionVO);

	    satisfactionVO.setStsfdgNo(data.getStsfdgNo());
	    satisfactionVO.setNttId(data.getNttId());
	    satisfactionVO.setBbsId(data.getBbsId());
	    satisfactionVO.setWrterId(data.getWrterId());
	    satisfactionVO.setWrterNm(data.getWrterNm());
	    satisfactionVO.setStsfdgPassword(data.getStsfdgPassword());
	    satisfactionVO.setStsfdgCn(data.getStsfdgCn());
	    satisfactionVO.setStsfdg(data.getStsfdg());
	    satisfactionVO.setUseAt(data.getUseAt());
	    satisfactionVO.setFrstRegisterPnttm(data.getFrstRegisterPnttm());
	    satisfactionVO.setFrstRegisterNm(data.getFrstRegisterNm());
	}
	////-----------------------------

	return "egovframework/com/cop/stf/EgovSatisfactionList";
    }

    /**
     * 留뚯”?꾩“?щ? ?섏젙?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/updateSatisfaction.do")
    public String updateSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?묒꽦??諛?留뚯”?꾨뒗 ?꾩닔 ?낅젰媛믪엯?덈떎.");

		    return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
		    satisfaction.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    satisfaction.setStsfdgPassword("");	// dummy

		    bbsSatisfactionService.updateSatisfaction(satisfaction);

		    satisfactionVO.setStsfdgCn("");
		    satisfactionVO.setStsfdgNo("");
		    satisfactionVO.setStsfdg(0);
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
    }

    /**
     * ?듬챸 留뚯”?꾩“?щ? ?섏젙?쒕떎.
     *
     * @param satisfactionVO
     * @param satisfaction
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/stf/anonymous/updateSatisfaction.do")
    public String updateAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, @Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?묒꽦??諛?留뚯”?꾨뒗 ?꾩닔 ?낅젰媛믪엯?덈떎.");

		    return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
		}

		satisfaction.setLastUpdusrId("ANONYMOUS");
		satisfaction.setStsfdgPassword(EgovFileScrty.encryptPassword(satisfaction.getStsfdgPassword(), satisfaction.getStsfdgNo()));

		bbsSatisfactionService.updateSatisfaction(satisfaction);

		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdg(0);
		satisfactionVO.setWrterNm("");

		return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
    }
}
