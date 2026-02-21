package egovframework.com.utl.sys.htm.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.htm.service.EgovHttpMonService;
import egovframework.com.utl.sys.htm.service.HttpMntrngChecker;
import egovframework.com.utl.sys.htm.service.HttpMon;
import egovframework.com.utl.sys.htm.service.HttpMonLog;
import egovframework.com.utl.sys.htm.service.HttpMonLogVO;
import egovframework.com.utl.sys.htm.service.HttpMonVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??- HTTP???????????controller ?????? ???.
 *
 * ??? - HTTP????????????, ??, ???? ?????????. - HTTP??????????? ?,
 * ??????.
 *
 * @author ??
 * @version 1.0
 * @created 17-6-2010 ?? 5:12:43
 *
 *          <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ??    ????
 *  2011.8.26	???		IncludedInfo annotation ??
 *          </pre>
 **/
@Controller
public class EgovHttpMonController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovHttpMonController.class);

	@Resource(name = "EgovHttpMonService")
	protected EgovHttpMonService egovHttpMonService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ???HTTP??????????????.
	 *
	 * @param httpMonVO- HTTP???????VO
	 * @return String - ? Url
	 *
	 * @param httpMonVO
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonList.do")
	public String selectHttpMonList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") HttpMonVO searchVO, ModelMap model) throws Exception {
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<HttpMonVO> resultList = egovHttpMonService.selectHttpMonList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovHttpMonService.selectHttpMonTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonList";
	}

	/**
	 * HTTP???????????????.
	 *
	 * @param HttpMonVO - HTTP???????VO
	 * @return String - ? Url
	 *
	 * @param httpMonVO
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonDetail.do")
	public String selectHttpMonDetail(@ModelAttribute("loginVO") LoginVO loginVO, HttpMon httpMon, ModelMap model)
			throws Exception {
		HttpMon vo = egovHttpMonService.selectHttpMonDetail(httpMon);
		model.addAttribute("result", vo);

		// LOGGER.info("SiteUrl============================??? ????
		// ?========================>" + vo.getSiteUrl());
		// model.addAttribute("siteUrl",
		// HttpMntrngChecker.getPrductStatus(vo.getSiteUrl()));

		return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonDetail";
	}

	/**
	 * Http???????????????.
	 *
	 * @param siteUrl - Http???????model
	 * @return String - ? Url
	 *
	 * @param siteUrl
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonRegist.do")
	public String insertHttpMon(
			@Valid @ModelAttribute("httpMon") HttpMon httpMon,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (httpMon.getWebKind() == null || httpMon.getWebKind().equals("") || bindingResult.hasErrors()) {
			return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonRegist";
		}

		// ?????
		httpMon.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		httpMon.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		egovHttpMonService.insertHttpMon(httpMon);
		return "forward:/utl/sys/htm/EgovComUtlHttpMonList.do";
	}

	/**
	 * ?? ??Http???????????? ??.
	 *
	 * @param siteUrl - Http???????model
	 * @return String - ? Url
	 *
	 * @param siteUrl
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonModify.do")
	public String updateHttpMon(
			@ModelAttribute("loginVO") LoginVO loginVO,
			@Valid @ModelAttribute("httpMon") HttpMon httpMon,
			@RequestParam Map<?, ?> commandMap,
			BindingResult bindingResult, ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			HttpMon vo = egovHttpMonService.selectHttpMonDetail(httpMon);
			model.addAttribute("httpMon", vo);

			return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonModify";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				HttpMon vo = egovHttpMonService.selectHttpMonDetail(httpMon);
				model.addAttribute("httpMon", vo);

				return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonModify";
			}
			httpMon.setLastUpdusrId(loginVO.getUniqId());
			egovHttpMonService.updateHttpMon(httpMon);
			return "forward:/utl/sys/htm/EgovComUtlHttpMonList.do";
		} else {
			return "forward:/utl/sys/htm/EgovComUtlHttpMonList.do";
		}
	}

	/**
	 * ????HTTP???????????????.
	 *
	 * @param siteUrl - HTTP???????model
	 * @return String - ? Url
	 *
	 * @param siteUrl
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonRemove.do")
	public String deleteHttpMon(@ModelAttribute("loginVO") LoginVO loginVO, HttpMon cmmWebKind, ModelMap model)
			throws Exception {
		egovHttpMonService.deleteHttpMon(cmmWebKind);
		return "forward:/utl/sys/htm/EgovComUtlHttpMonList.do";
	}

	/**
	 * HTTP ??????????.
	 *
	 * @param httpMon
	 * @return String
	 *
	 * @param httpSttusCd
	 **/
	@RequestMapping("/utl/sys/htm/selectHttpMonSttus.do")
	public String selectProcessSttus(@ModelAttribute("httpMonVO") HttpMonVO httpMonVO, ModelMap model)
			throws Exception {

		LOGGER.info("SiteUrl" + httpMonVO.getSiteUrl());
		model.addAttribute("httpSttusCd", HttpMntrngChecker.getPrductStatus(httpMonVO.getSiteUrl()));
		model.addAttribute("httpMonVO", httpMonVO);

		return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonRegist";
	}

	/**
	 * ???HTTP??????????????.
	 *
	 * @param httpMonVO- HTTP???????VO
	 * @return String - ? Url
	 *
	 * @param httpMonVO
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonLogList.do")
	public String selectHttpMonLogList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") HttpMonLogVO httpMonLogVO, ModelMap model) throws Exception {
		/** EgovPropertyService.sample **/
		httpMonLogVO.setPageUnit(propertiesService.getInt("pageUnit"));
		httpMonLogVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(httpMonLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(httpMonLogVO.getPageUnit());
		paginationInfo.setPageSize(httpMonLogVO.getPageSize());

		httpMonLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		httpMonLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		httpMonLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// ???
		if (httpMonLogVO.getSearchBgnDe() != null && httpMonLogVO.getSearchEndDe() != null) {
			if (!httpMonLogVO.getSearchBgnDe().equals("") && !httpMonLogVO.getSearchEndDe().equals("")) {
				httpMonLogVO.setSearchBgnDt(httpMonLogVO.getSearchBgnDe() + " " + httpMonLogVO.getSearchBgnHour());
				httpMonLogVO.setSearchEndDt(httpMonLogVO.getSearchEndDe() + " " + httpMonLogVO.getSearchEndHour());
			}
		}

		Map<String, Object> map = egovHttpMonService.selectHttpMonLogList(httpMonLogVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		// ?????
		model.addAttribute("searchBgnHour", getTimeHH());
		// ????
		model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonLogList";

	}

	/**
	 * HTTP???????????????.
	 *
	 * @param HttpMonVO - HTTP???????VO
	 * @return String - ? Url
	 *
	 * @param httpMonVO
	 **/
	@RequestMapping(value = "/utl/sys/htm/EgovComUtlHttpMonDetailLog.do")
	public String selectHttpMonDetailLog(@ModelAttribute("loginVO") LoginVO loginVO, HttpMonLog httpMonLog,
			ModelMap model) throws Exception {
		HttpMonLog vo = egovHttpMonService.selectHttpMonDetailLog(httpMonLog);
		model.addAttribute("result", vo);

		return "egovframework/com/utl/sys/htm/EgovComUtlHttpMonDetailLog";
	}

	/**
	 * ????LIST?????.
	 *
	 * @return List
	 * @throws
	 **/
	private List<ComDefaultCodeVO> getTimeHH() {
		ArrayList<ComDefaultCodeVO> listHH = new ArrayList<>();
		// HashMap hmHHMM;
		for (int i = 0; i < 24; i++) {
			String sHH = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sHH = "0" + strI;
			} else {
				sHH = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sHH);
			codeVO.setCodeNm(sHH + ":00");

			listHH.add(codeVO);
		}

		return listHH;
	}

}
