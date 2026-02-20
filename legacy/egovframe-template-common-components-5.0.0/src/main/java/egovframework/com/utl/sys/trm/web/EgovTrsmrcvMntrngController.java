package egovframework.com.utl.sys.trm.web;
import java.sql.SQLException;
import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.validation.Errors;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.trm.service.CntcVO;
import egovframework.com.utl.sys.trm.service.EgovTrsmrcvMntrngService;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrng;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngLog;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?≪닔?좊え?덊꽣留곸뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?≪닔?좊え?덊꽣留곴?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * ?≪닔?좊え?덊꽣留곴?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *  ?섏젙??               ?섏젙??          ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2010.06.21   源吏꾨쭔            理쒖큹 ?앹꽦
 *  2011.08.26   ?뺤쭊??           IncludedInfo annotation 異붽?
 *  2017-02-14   ?댁젙?            ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *  2019.12.06   ?좎슜??           KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 *
 * </pre>
 */
@Controller
public class EgovTrsmrcvMntrngController {

	@Resource(name = "egovTrsmrcvMntrngService")
	private EgovTrsmrcvMntrngService egovTrsmrcvMntrngService;

    @Resource(name="propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    private EgovMessageSource egovMessageSource;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovTrsmrcvMntrngController.class);

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ??젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng ??젣????≪닔?좊え?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/utl/sys/trm/deleteTrsmrcvMntrng.do")
	public String deleteTrsmrcvMntrng(@ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		egovTrsmrcvMntrngService.deleteTrsmrcvMntrng(trsmrcvMntrng);

    	return "forward:/utl/sys/trm/getTrsmrcvMntrngList.do";
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?깅줉?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng ?깅줉????≪닔?좊え?덊꽣留걅odel
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/utl/sys/trm/addTrsmrcvMntrng.do")
	public String insertTrsmrcvMntrng(@Valid @ModelAttribute TrsmrcvMntrng trsmrcvMntrng, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        checkDuplication(trsmrcvMntrng, bindingResult);
    	if (bindingResult.hasErrors()){
    		model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);
    		return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngRegist";
		}else{
    		//?꾩씠???ㅼ젙
			trsmrcvMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovTrsmrcvMntrngService.insertTrsmrcvMntrng(trsmrcvMntrng);
	        //Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
	        model.addAttribute("resultMsg", "success.common.insert");
		}
    	return "forward:/utl/sys/trm/getTrsmrcvMntrngList.do";
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸젙蹂댁쓣 ?곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng 議고쉶????≪닔?좊え?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/utl/sys/trm/getTrsmrcvMntrng.do")
	public String selectTrsmrcvMntrng(@ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{
    	LOGGER.debug(" 議고쉶議곌굔 : {}", trsmrcvMntrng);
		TrsmrcvMntrng result = egovTrsmrcvMntrngService.selectTrsmrcvMntrng(trsmrcvMntrng);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngDetail";

	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂댁쓣 ?곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrngLog 議고쉶????≪닔?좊え?덊꽣留곷줈洹퇹odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/utl/sys/trm/getTrsmrcvMntrngLog.do")
	public String selectTrsmrcvMntrngLog(@ModelAttribute("searchVO") TrsmrcvMntrngLog trsmrcvMntrngLog, ModelMap model)
	  throws Exception{
    	LOGGER.debug(" 議고쉶議곌굔 : {}", trsmrcvMntrngLog);
		TrsmrcvMntrngLog result = egovTrsmrcvMntrngService.selectTrsmrcvMntrngLog(trsmrcvMntrngLog);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngLogDetail";

	}

	/**
	 * ?깅줉?붾㈃???꾪븳 ?≪닔?좊え?덊꽣留곸젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng 議고쉶????≪닔?좊え?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngForRegist.do")
	public String selectTrsmrcvMntrngForRegist(@ModelAttribute("searchVO")TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{
        model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);

        return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngRegist";
	}

	/**
	 * ?섏젙?붾㈃???꾪븳 ?≪닔?좊え?덊꽣留곸젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng 議고쉶????≪닔?좊え?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngForUpdate.do")
	public String selectTrsmrcvMntrngForUpdate(@ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{

        // DB?쒕퉬?ㅻえ?덊꽣留??뺣낫 議고쉶.
		LOGGER.debug(" 議고쉶議곌굔 : {}", trsmrcvMntrng);
        TrsmrcvMntrng result = egovTrsmrcvMntrngService.selectTrsmrcvMntrng(trsmrcvMntrng);
        model.addAttribute("trsmrcvMntrng", result);
        LOGGER.debug(" 寃곌낵媛?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngUpdt";

	}

	/**
	 * ?≪닔?좊え?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@SuppressWarnings("unused")
	@IncludedInfo(name="?≪닔?좊え?덊꽣留?,order = 2080 ,gid = 90)
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngList.do")
	public String selectTrsmrcvMntrngList(@ModelAttribute("searchVO") TrsmrcvMntrng searchVO, ModelMap model)
	  throws Exception{
		LOGGER.debug(" 議고쉶議곌굔 : {}", searchVO);

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();


		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize")/2);

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<TrsmrcvMntrng> resultList = egovTrsmrcvMntrngService.selectTrsmrcvMntrngList(searchVO);
		int totCnt = egovTrsmrcvMntrngService.selectTrsmrcvMntrngListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngList";
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngLogList.do")
	public String selectTrsmrcvMntrngLogList(@ModelAttribute("searchVO") TrsmrcvMntrngLog searchVO, ModelMap model)
	  throws Exception{
		LOGGER.debug(" 議고쉶議곌굔 : {}", searchVO);

		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize")/2);

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<TrsmrcvMntrngLog> resultList = egovTrsmrcvMntrngService.selectTrsmrcvMntrngLogList(searchVO);
		int totCnt = egovTrsmrcvMntrngService.selectTrsmrcvMntrngLogListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngLogList";
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?섏젙?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param trsmrcvMntrng ?섏젙????≪닔?좊え?덊꽣留걅odel
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/updateTrsmrcvMntrng.do")
	public String updateTrsmrcvMntrng(@Valid @ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		if (bindingResult.hasErrors()) {
			model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);
		    return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngUpdt";
		}

		// ?뺣낫 ?낅뜲?댄듃
		trsmrcvMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	    egovTrsmrcvMntrngService.updateTrsmrcvMntrng(trsmrcvMntrng);

		return "forward:/utl/sys/trm/getTrsmrcvMntrngList.do";
	}

	/**
	 * ?곌퀎?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/getCntcList.do")
	public String selectCntcList(@ModelAttribute("searchVO") CntcVO searchVO, ModelMap model)
	  throws Exception {

		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<CntcVO> resultList = egovTrsmrcvMntrngService.selectCntcList(searchVO);
		int totCnt = egovTrsmrcvMntrngService.selectCntcListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/trm/EgovCntcListPopup";
	}
	/**
	 * ?곌퀎?뺣낫 議고쉶?앹뾽???ㅽ뻾?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/trm/getCntcListPopup.do")
	public String openPopupWindow(@ModelAttribute("searchVO") CntcVO searchVO, ModelMap model)
	  throws Exception{
		return "egovframework/com/utl/sys/trm/EgovCntcListPopupFrame";
	}

	private void checkDuplication(TrsmrcvMntrng obj, Errors errors) {
		TrsmrcvMntrng trsmrcvMntrng = obj;
		String cntcId = trsmrcvMntrng.getCntcId();

		TrsmrcvMntrng exist = null;

		try {
			exist = egovTrsmrcvMntrngService.selectTrsmrcvMntrng(trsmrcvMntrng);
			if (exist != null) {
				errors.rejectValue("cntcId", "errors.cntcId", new Object [] { cntcId },
			    "紐⑤땲?곕쭅??곸쑝濡??곌퀎ID {0}???대? 議댁옱?⑸땲??");
				return ;
			}
		} catch (SQLException  se) {
			errors.rejectValue("cntcId", "errors.cntcId", new Object [] { cntcId },
				    " 紐⑤땲?곕쭅??곸쑝濡??곌퀎ID {0}??以묐났泥댄겕以??쒖뒪?쒖뿉?ш? 諛쒖깮?덉뒿?덈떎. ");
					return ;
		} catch (Exception  se) {
			errors.rejectValue("cntcId", "errors.cntcId", new Object [] { cntcId },
		    " 紐⑤땲?곕쭅??곸쑝濡??곌퀎ID {0}??以묐났泥댄겕以??쒖뒪?쒖뿉?ш? 諛쒖깮?덉뒿?덈떎. ");
			return ;
		}
	}
}