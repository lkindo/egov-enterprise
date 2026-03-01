package egovframework.com.utl.sys.dbm.web;
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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.dbm.service.DbMntrng;
import egovframework.com.utl.sys.dbm.service.DbMntrngLog;
import egovframework.com.utl.sys.dbm.service.EgovDbMntrngService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * DB?쒕퉬?ㅻえ?덊꽣留곴?由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * DB?쒕퉬?ㅻえ?덊꽣留곴?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * DB?쒕퉬?ㅻえ?덊꽣留곴?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *  2011.08.26	 ?뺤쭊??            IncludedInfo annotation 異붽?
 *  2019-12-06   ?좎슜??           KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 *
 * </pre>
 */
@Controller
public class EgovDbMntrngController {

	/** egovDbMntrngService */
	@Resource(name = "egovDbMntrngService")
	private EgovDbMntrngService egovDbMntrngService;

    @Resource(name="propertiesService")
    private EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    private EgovMessageSource egovMessageSource;

    /** cmmUseService */
    @Resource(name="EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

	/** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(EgovDbMntrngController.class);

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ??젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng ??젣???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/utl/sys/dbm/deleteDbMntrng.do")
	public String deleteDbMntrng(DbMntrng dbMntrng, ModelMap model)
	  throws Exception{
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		egovDbMntrngService.deleteDbMntrng(dbMntrng);

    	return "forward:/utl/sys/dbm/getDbMntrngList.do";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?깅줉?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng ?깅줉???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/dbm/addDbMntrng.do")
	public String insertDbMntrng(@Valid DbMntrng dbMntrng, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        checkDuplication(dbMntrng, bindingResult);
    	if (bindingResult.hasErrors()){
    		referenceData(model);
    		model.addAttribute("dbMntrng", dbMntrng);
    		return "egovframework/com/utl/sys/dbm/EgovDbMntrngRegist";
		}else{
    		//?꾩씠???ㅼ젙
			dbMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			dbMntrng.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovDbMntrngService.insertDbMntrng(dbMntrng);
	        //Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
	        model.addAttribute("resultMsg", "success.common.insert");
		}
    	return "forward:/utl/sys/dbm/getDbMntrngList.do";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂댁쓣 ?곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/dbm/getDbMntrng.do")
	public String selectDbMntrng(@ModelAttribute("searchVO")DbMntrng dbMntrng, ModelMap model)
	  throws Exception{
		LOGGER.debug(" 議고쉶議곌굔 : {}", dbMntrng);
        DbMntrng result = egovDbMntrngService.selectDbMntrng(dbMntrng);
        model.addAttribute("resultInfo", result);
        LOGGER.debug(" 寃곌낵媛?: {}", result);

        return "egovframework/com/utl/sys/dbm/EgovDbMntrngDetail";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몄젙蹂댁쓣 ?곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留곷줈洹퇹odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */

	@RequestMapping("/utl/sys/dbm/getDbMntrngLog.do")
	public String selectDbMntrngLog(@ModelAttribute("searchVO")DbMntrngLog dbMntrngLog, ModelMap model)
	  throws Exception{
		LOGGER.debug(" 議고쉶議곌굔 : {}", dbMntrngLog);
        DbMntrngLog result = egovDbMntrngService.selectDbMntrngLog(dbMntrngLog);
        model.addAttribute("resultInfo", result);
        LOGGER.debug(" 寃곌낵媛?: {}", result);

        return "egovframework/com/utl/sys/dbm/EgovDbMntrngLogDetail";
	}

	/**
	 * ?깅줉?붾㈃???꾪븳 DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/dbm/getDbMntrngForRegist.do")
	public String selectDbMntrngForRegist(@ModelAttribute("searchVO")DbMntrng dbMntrng, ModelMap model)
	  throws Exception{
        referenceData(model);
        model.addAttribute("dbMntrng", dbMntrng);

        return "egovframework/com/utl/sys/dbm/EgovDbMntrngRegist";
	}

	/**
	 * Reference Data 瑜??ㅼ젙?쒕떎.
	 * @param model   ?붾㈃?쯵pring Model媛앹껜
	 * @throws Exception
	 */
	private void referenceData(ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();

        //DBMS醫낅쪟肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
        vo.setCodeId("COM048");
        List<CmmnDetailCode> dbmsKindList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("dbmsKindList",      dbmsKindList);     //DBMS醫낅쪟肄붾뱶紐⑸줉
	}

	/**
	 * ?섏젙?붾㈃???꾪븳 DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/dbm/getDbMntrngForUpdate.do")
	public String selectDbMntrngForUpdate(@ModelAttribute("searchVO") DbMntrng dbMntrng, ModelMap model)
	  throws Exception{
        referenceData(model);

        // DB?쒕퉬?ㅻえ?덊꽣留??뺣낫 議고쉶.
        LOGGER.debug(" 議고쉶議곌굔 : {}", dbMntrng);
        DbMntrng result = egovDbMntrngService.selectDbMntrng(dbMntrng);
        model.addAttribute("dbMntrng", result);
        LOGGER.debug(" 寃곌낵媛?: {}", result);

      return "egovframework/com/utl/sys/dbm/EgovDbMntrngUpdt";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@SuppressWarnings("unused")
	@IncludedInfo(name="DB?쒕퉬?ㅻえ?덊꽣留?, order = 2090 ,gid = 90)
	@RequestMapping("/utl/sys/dbm/getDbMntrngList.do")
	public String selectDbMntrngList(@ModelAttribute("searchVO") DbMntrng searchVO, ModelMap model)
	  throws Exception{
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//searchVO.setUniqId(user.getUniqId());
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<DbMntrng> resultList = egovDbMntrngService.selectDbMntrngList(searchVO);
		int totCnt = egovDbMntrngService.selectDbMntrngListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngList";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping("/utl/sys/dbm/getDbMntrngLogList.do")
	public String selectDbMntrngLogList(@ModelAttribute("searchVO") DbMntrngLog searchVO, ModelMap model)
	  throws Exception{
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//searchVO.setUniqId(user.getUniqId());
        // DB?쒕퉬?ㅻえ?덊꽣留??뺣낫 議고쉶.
		LOGGER.debug(" 議고쉶議곌굔 : {}", searchVO);


		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<DbMntrngLog> resultList = egovDbMntrngService.selectDbMntrngLogList(searchVO);
		int totCnt = egovDbMntrngService.selectDbMntrngLogListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngLogList";
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?섏젙?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param dbMntrng ?섏젙???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/utl/sys/dbm/updateDbMntrng.do")
	public String updateDbMntrng(@Valid DbMntrng dbMntrng, BindingResult bindingResult, ModelMap model)
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
			referenceData(model);
			model.addAttribute("dbMntrng", dbMntrng);
		    return "egovframework/com/utl/sys/dbm/EgovDbMntrngUpdt";
		}

		// ?뺣낫 ?낅뜲?댄듃
		dbMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	    egovDbMntrngService.updateDbMntrng(dbMntrng);

		return "forward:/utl/sys/dbm/getDbMntrngList.do";
	}

	private void checkDuplication(DbMntrng obj, Errors errors) {
		DbMntrng dbMntrng = obj;
		String dataSourcNm = dbMntrng.getDataSourcNm();

		DbMntrng exist = null;

		try {
			exist = egovDbMntrngService.selectDbMntrng(dbMntrng);
			if (exist != null) {
				errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object [] { dataSourcNm },
			    "紐⑤땲?곕쭅??곸쑝濡??곗씠??뚯뒪紐?{0}???대? 議댁옱?⑸땲??");
				return ;
			}
		} catch (SQLException  se) {
			errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object [] { dataSourcNm },
				    " 紐⑤땲?곕쭅??곸쑝濡??곗씠??뚯뒪紐?{0}??以묐났泥댄겕以??쒖뒪?쒖뿉?ш? 諛쒖깮?덉뒿?덈떎. ");
					return ;
		} catch (Exception  se) {
			errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object [] { dataSourcNm },
		    " 紐⑤땲?곕쭅??곸쑝濡??곗씠??뚯뒪紐?{0}??以묐났泥댄겕以??쒖뒪?쒖뿉?ш? 諛쒖깮?덉뒿?덈떎. ");
			return ;
		}

	}

}
