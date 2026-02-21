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
 * DB???????? ????controller ?????? ???.
 *
 * DB???????? ?????, ??, ???? ?????????.
 * DB???????? ??? ?, ??????.
 * 
 * @author ?
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *  ????               ????          ????
 *  ----------   --------   ---------------------------
 *  2010.06.21   ?           ????
 *  2011.08.26	 ???            IncludedInfo annotation ??
 *  2019-12-06   ???           KISA ?? ??(????????
 *
 *      </pre>
 **/
@Controller
public class EgovDbMntrngController {

	@Resource(name = "EgovDbMntrngService")
	private EgovDbMntrngService egovDbMntrngService;

	@Resource(name = "propertiesService")
	private EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	/** cmmUseService **/
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** logger **/
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovDbMntrngController.class);

	/**
	 * DB?????????????.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng ???????DB??????odel
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/deleteDbMntrng.do")
	public String deleteDbMntrng(DbMntrng dbMntrng, ModelMap model)
			throws Exception {
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		egovDbMntrngService.deleteDbMntrng(dbMntrng);

		return "forward:/utl/sys/dbm/getDbMntrngList.do";
	}

	/**
	 * DB???????????.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng      ?????DB??????odel
	 * @param bindingResult BindingResult
	 * @param model         ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/addDbMntrng.do")
	public String insertDbMntrng(@Valid DbMntrng dbMntrng, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		checkDuplication(dbMntrng, bindingResult);
		if (bindingResult.hasErrors()) {
			referenceData(model);
			model.addAttribute("dbMntrng", dbMntrng);
			return "egovframework/com/utl/sys/dbm/EgovDbMntrngRegist";
		} else {
			// ?????
			dbMntrng.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			dbMntrng.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovDbMntrngService.insertDbMntrng(dbMntrng);
			// Exception ?? ??????
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/utl/sys/dbm/getDbMntrngList.do";
	}

	/**
	 * DB???????? ????.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng ?????DB??????odel
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/getDbMntrng.do")
	public String selectDbMntrng(@ModelAttribute("searchVO") DbMntrng dbMntrng, ModelMap model)
			throws Exception {
		LOGGER.debug("          ?   ?          : {}", dbMntrng);
		DbMntrng result = egovDbMntrngService.selectDbMntrng(dbMntrng);
		model.addAttribute("resultInfo", result);
		LOGGER.debug("          ?      ?: {}", result);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngDetail";
	}

	/**
	 * DB????????????.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng ?????DB???????del
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/

	@RequestMapping("/utl/sys/dbm/getDbMntrngLog.do")
	public String selectDbMntrngLog(@ModelAttribute("searchVO") DbMntrngLog dbMntrngLog, ModelMap model)
			throws Exception {
		LOGGER.debug("          ?   ?          : {}", dbMntrngLog);
		DbMntrngLog result = egovDbMntrngService.selectDbMntrngLog(dbMntrngLog);
		model.addAttribute("resultInfo", result);
		LOGGER.debug("          ?      ?: {}", result);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngLogDetail";
	}

	/**
	 * ????? DB???????? ???.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng ?????DB??????odel
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/getDbMntrngForRegist.do")
	public String selectDbMntrngForRegist(@ModelAttribute("searchVO") DbMntrng dbMntrng, ModelMap model)
			throws Exception {
		referenceData(model);
		model.addAttribute("dbMntrng", dbMntrng);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngRegist";
	}

	/**
	 * Reference Data ??????.
	 * 
	 * @param model ??ring Model?
	 * @throws Exception
	 **/
	private void referenceData(ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();

		// DBMS??????????
		vo.setCodeId("COM048");
		List<CmmnDetailCode> dbmsKindList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("dbmsKindList", dbmsKindList); // DBMS??
	}

	/**
	 * ?????? DB???????? ???.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng ?????DB??????odel
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/getDbMntrngForUpdate.do")
	public String selectDbMntrngForUpdate(@ModelAttribute("searchVO") DbMntrng dbMntrng, ModelMap model)
			throws Exception {
		referenceData(model);

		// DB???????? ??
		LOGGER.debug("          ?   ?          : {}", dbMntrng);
		DbMntrng result = egovDbMntrngService.selectDbMntrng(dbMntrng);
		model.addAttribute("dbMntrng", result);
		LOGGER.debug("          ?      ?: {}", result);

		return "egovframework/com/utl/sys/dbm/EgovDbMntrngUpdt";
	}

	/**
	 * DB????????????.
	 * 
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@SuppressWarnings("unused")
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
// 	@RequestMapping("/utl/sys/dbm/getDbMntrngList.do")
	public String selectDbMntrngList(@ModelAttribute("searchVO") DbMntrng searchVO, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// searchVO.setUniqId(user.getUniqId());
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
	 * DB????????????.
	 * 
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model    ModelMap
	 * @exception Exception Exception
	 **/
	@SuppressWarnings("unused")
	@RequestMapping("/utl/sys/dbm/getDbMntrngLogList.do")
	public String selectDbMntrngLogList(@ModelAttribute("searchVO") DbMntrngLog searchVO, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// searchVO.setUniqId(user.getUniqId());
		// DB???????? ??
		LOGGER.debug("          ?   ?          : {}", searchVO);

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
	 * DB????????????.
	 * 
	 * @return ?URL
	 *
	 * @param dbMntrng      ??????DB??????odel
	 * @param bindingResult BindingResult
	 * @param model         ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/utl/sys/dbm/updateDbMntrng.do")
	public String updateDbMntrng(@Valid DbMntrng dbMntrng, BindingResult bindingResult, ModelMap model)
			throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (bindingResult.hasErrors()) {
			referenceData(model);
			model.addAttribute("dbMntrng", dbMntrng);
			return "egovframework/com/utl/sys/dbm/EgovDbMntrngUpdt";
		}

		// ? ????
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
				errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object[] { dataSourcNm },
						"         ??         ???            ??         ?????      ?{0}????  ?          ???      ??");
				return;
			}
		} catch (SQLException se) {
			errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object[] { dataSourcNm },
					"          ??         ???            ??         ?????      ?{0}??        ?     ?         ???      ??      ???             ??      ??      . ");
			return;
		} catch (Exception se) {
			errors.rejectValue("dataSourcNm", "errors.dataSourcNm", new Object[] { dataSourcNm },
					"          ??         ???            ??         ?????      ?{0}??        ?     ?         ???      ??      ???             ??      ??      . ");
			return;
		}

	}

}
