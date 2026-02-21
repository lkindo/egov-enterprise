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
 * ??????????controller ?????? ???.
 *
 * ??????? ?????, ??, ???? ?????????.
 * ??????? ??? ?, ??????.
 * @author ?
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?? 10:27:13
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *  ????               ????          ????
 *  ----------   --------   ---------------------------
 *  2010.06.21   ?           ????
 *  2011.08.26   ???           IncludedInfo annotation ??
 *  2017-02-14   ????            ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
 *  2019.12.06   ???           KISA ?? ??(????????
 *
 * </pre>
 **/
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
	 * ????????????.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ????????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
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
	 * ??????????.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ??????????odel
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 **/
    @RequestMapping("/utl/sys/trm/addTrsmrcvMntrng.do")
	public String insertTrsmrcvMntrng(@Valid @ModelAttribute TrsmrcvMntrng trsmrcvMntrng, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?????????
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//?????
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        checkDuplication(trsmrcvMntrng, bindingResult);
    	if (bindingResult.hasErrors()){
    		model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);
    		return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngRegist";
		}else{
    		//?????
			trsmrcvMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovTrsmrcvMntrngService.insertTrsmrcvMntrng(trsmrcvMntrng);
	        //Exception ?? ??????
	        model.addAttribute("resultMsg", "success.common.insert");
		}
    	return "forward:/utl/sys/trm/getTrsmrcvMntrngList.do";
	}

	/**
	 * ??????? ????.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ??????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
    @RequestMapping("/utl/sys/trm/getTrsmrcvMntrng.do")
	public String selectTrsmrcvMntrng(@ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{
    	LOGGER.debug("          ?   ?          : {}", trsmrcvMntrng);
		TrsmrcvMntrng result = egovTrsmrcvMntrngService.selectTrsmrcvMntrng(trsmrcvMntrng);
		model.addAttribute("resultInfo", result);
		LOGGER.debug("          ?      ?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngDetail";

	}

	/**
	 * ???????????.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrngLog ???????????del
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
    @RequestMapping("/utl/sys/trm/getTrsmrcvMntrngLog.do")
	public String selectTrsmrcvMntrngLog(@ModelAttribute("searchVO") TrsmrcvMntrngLog trsmrcvMntrngLog, ModelMap model)
	  throws Exception{
    	LOGGER.debug("          ?   ?          : {}", trsmrcvMntrngLog);
		TrsmrcvMntrngLog result = egovTrsmrcvMntrngService.selectTrsmrcvMntrngLog(trsmrcvMntrngLog);
		model.addAttribute("resultInfo", result);
		LOGGER.debug("          ?      ?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngLogDetail";

	}

	/**
	 * ????? ??????? ???.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ??????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngForRegist.do")
	public String selectTrsmrcvMntrngForRegist(@ModelAttribute("searchVO")TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{
        model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);

        return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngRegist";
	}

	/**
	 * ?????? ??????? ???.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ??????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngForUpdate.do")
	public String selectTrsmrcvMntrngForUpdate(@ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, ModelMap model)
	  throws Exception{

        // DB???????? ??
		LOGGER.debug("          ?   ?          : {}", trsmrcvMntrng);
        TrsmrcvMntrng result = egovTrsmrcvMntrngService.selectTrsmrcvMntrng(trsmrcvMntrng);
        model.addAttribute("trsmrcvMntrng", result);
        LOGGER.debug("          ?      ?: {}", result);

      return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngUpdt";

	}

	/**
	 * ???????????.
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@SuppressWarnings("unused")
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
// 	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngList.do")
	public String selectTrsmrcvMntrngList(@ModelAttribute("searchVO") TrsmrcvMntrng searchVO, ModelMap model)
	  throws Exception{
		LOGGER.debug("          ?   ?          : {}", searchVO);

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
	 * ???????????.
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/trm/getTrsmrcvMntrngLogList.do")
	public String selectTrsmrcvMntrngLogList(@ModelAttribute("searchVO") TrsmrcvMntrngLog searchVO, ModelMap model)
	  throws Exception{
		LOGGER.debug("          ?   ?          : {}", searchVO);

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
	 * ???????????.
	 * @return ?URL
	 *
	 * @param trsmrcvMntrng ???????????odel
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/trm/updateTrsmrcvMntrng.do")
	public String updateTrsmrcvMntrng(@Valid @ModelAttribute("searchVO") TrsmrcvMntrng trsmrcvMntrng, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?????????
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
		//?????
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		if (bindingResult.hasErrors()) {
			model.addAttribute("trsmrcvMntrng", trsmrcvMntrng);
		    return "egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngUpdt";
		}

		// ? ????
		trsmrcvMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	    egovTrsmrcvMntrngService.updateTrsmrcvMntrng(trsmrcvMntrng);

		return "forward:/utl/sys/trm/getTrsmrcvMntrngList.do";
	}

	/**
	 * ?? ?????.
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
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
	 * ?? ?????????.
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
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
			    "         ??         ???            ??           D {0}????  ?          ???      ??");
				return ;
			}
		} catch (SQLException  se) {
			errors.rejectValue("cntcId", "errors.cntcId", new Object [] { cntcId },
				    "          ??         ???            ??           D {0}??        ?     ?         ???      ??      ???             ??      ??      . ");
					return ;
		} catch (Exception  se) {
			errors.rejectValue("cntcId", "errors.cntcId", new Object [] { cntcId },
		    "          ??         ???            ??           D {0}??        ?     ?         ???      ??      ???             ??      ??      . ");
			return ;
		}
	}
}
