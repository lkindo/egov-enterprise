package egovframework.com.utl.sys.fsm.web;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.fsm.service.EgovFileSysMntrngService;
import egovframework.com.utl.sys.fsm.service.FileSysMntrng;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLogVO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngVO;
import egovframework.com.utl.sys.fsm.service.FileSystemChecker;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??
 * - ???????????? ????controller ?????? ???.
 *
 * ???
 * - ???????????? ?????, ??, ???? ???????.
 * - ???????????? ??? ?, ??????.
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:26
 *  <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.28	???	????
 *  2011.08.26	???	IncludedInfo annotation ??
 *  2023.06.09	??		NSR ? (??????????? ??)
 *  2024.05.02  ??        NSR ? (????????? ??? ??????)
 * </pre>
 **/
@Controller
public class EgovFileSysMntrngController {

	@Resource(name = "EgovFileSysMntrngService")
	protected EgovFileSysMntrngService fileSysMntrngService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?????????????????????????.
	 * @param FileSysMntrngVO
	 * @return  String
	 *
	 * @param fileSysMntrngVO
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
// 	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngList.do")
	public String selectFileSysMntrngList(@ModelAttribute("searchVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		//?????
		//LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		fileSysMntrngVO.setPageUnit(propertyService.getInt("pageUnit"));
		fileSysMntrngVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(fileSysMntrngVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(fileSysMntrngVO.getPageUnit());
		paginationInfo.setPageSize(fileSysMntrngVO.getPageSize());

		fileSysMntrngVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		fileSysMntrngVO.setLastIndex(paginationInfo.getLastRecordIndex());
		fileSysMntrngVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = fileSysMntrngService.selectFileSysMntrngList(fileSysMntrngVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngList";
	}

	/**
	 * ????????? ???????????????.
	 * @param FileSysMntrngVO - ????????? VO
	 * @return  String - ? URL
	 *
	 * @param fileSysMntrngVO
	 **/
	@RequestMapping("/utl/sys/fsm/addFileSysMntrng.do")
	public String addFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return sLocationUrl;
	}

	/**
	 * ????????? ????????????????.
	 * @param FileSysMntrngVO - ????????? VO
	 * @return  String - ? URL
	 *
	 * @param fileSysMntrngVO
	 **/
	@RequestMapping("/utl/sys/fsm/modifyFileSysMntrng.do")
	public String modifyFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		FileSysMntrngVO resultVO = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);

		resultVO.setSearchCnd(fileSysMntrngVO.getSearchCnd());
		resultVO.setSearchWrd(fileSysMntrngVO.getSearchWrd());
		resultVO.setPageIndex(fileSysMntrngVO.getPageIndex());

		if (resultVO.getCreatDt() != null && !resultVO.getCreatDt().equals("")) {
			if (resultVO.getCreatDt().length() > 18) {
				resultVO.setCreatDt(resultVO.getCreatDt().substring(0, 19));
			}
		}

		model.addAttribute("fileSysMntrngVO", resultVO);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngUpdt";
	}

	/**
	 * ???????????????????.
	 * @param FileSysMntrngVO
	 * @return  String
	 *
	 * @param fileSysMntrngVO
	 **/
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrng.do")
	public String selectFileSysMntrng(@ModelAttribute("ntwrkSvcMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		FileSysMntrng fileSysMntrng = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);

		if (fileSysMntrng.getCreatDt() != null && !fileSysMntrng.getCreatDt().equals("")) {
			if (fileSysMntrng.getCreatDt().length() > 18) {
				fileSysMntrng.setCreatDt(fileSysMntrng.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("fileSysMntrngVO", fileSysMntrng);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngDetail";
	}

	/**
	 * ????????????????????.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 **/
	@RequestMapping("/utl/sys/fsm/updateFileSysMntrng.do")
	public String updateFileSysMntrng(
		@Valid @ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			FileSysMntrng fileSysMntrng = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);
			model.addAttribute("fileSysMntrng", fileSysMntrng);
			return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngUpdt";
		}

		if (isAuthenticated) {
			fileSysMntrngVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			String fileSysNm = fileSysMntrngVO.getFileSysNm();
			String safeFileSysNm = EgovWebUtil.removeCRLF(fileSysNm).replaceAll("\\|", "").replaceAll("&", "");
			fileSysMntrngVO.setFileSysNm(safeFileSysNm);

			fileSysMntrngService.updateFileSysMntrng(fileSysMntrngVO);
		}

		return "forward:/utl/sys/fsm/selectFileSysMntrngList.do";
	}

	/**
	 * ???????????????????.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 **/
	@RequestMapping("/utl/sys/fsm/insertFileSysMntrng.do")
	public String insertFileSysMntrng(
		@Valid @ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";

		if (bindingResult.hasErrors()) {
			return sLocationUrl;
		}

		//?????
		fileSysMntrngVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		fileSysMntrngVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		String fileSysNm = fileSysMntrngVO.getFileSysNm();
		String safeFileSysNm = EgovWebUtil.removeCRLF(fileSysNm).replaceAll("\\|", "").replaceAll("&", "");
		fileSysMntrngVO.setFileSysNm(safeFileSysNm);

		fileSysMntrngService.insertFileSysMntrng(fileSysMntrngVO);
		sLocationUrl = "forward:/utl/sys/fsm/selectFileSysMntrngList.do";

		return sLocationUrl;
	}

	/**
	 * ?????????????????????.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 **/
	@RequestMapping("/utl/sys/fsm/deleteFileSysMntrng.do")
	public String deleteFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		fileSysMntrngService.deleteFileSysMntrng(fileSysMntrngVO);
		return "forward:/utl/sys/fsm/selectFileSysMntrngList.do";
	}

	/**
	 * ??????? ??????.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 **/
	@RequestMapping("/utl/sys/fsm/selectFileSysMg.do")
	public String selectFileSysMg(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		//System.out.println("FileSysNm" + fileSysMntrngVO.getFileSysNm());

		int totalSpaceFileSys = 0;
		try {
			totalSpaceFileSys = FileSystemChecker.totalSpaceGb(EgovWebUtil.removeCRLF(fileSysMntrngVO.getFileSysNm()));
		} catch (IOException e) {
			model.addAttribute("notApplicableFileSys", "true");
		}
		model.addAttribute("fileSysMgValue", totalSpaceFileSys);
		model.addAttribute("fileSysMntrngVO", fileSysMntrngVO);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";
	}

	/**
	 * ???????????????????????.
	 * @param FileSysMntrngLogVO - ????????????VO
	 * @return  String - ? URL
	 *
	 * @param fileSysMntrngLogVO
	 **/
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngLogList.do")
	public String selectFileSysMntrngLogList(@ModelAttribute("searchVO") FileSysMntrngLogVO fileSysMntrngLogVO, ModelMap model) throws Exception {
		//?????
		//LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		fileSysMntrngLogVO.setPageUnit(propertyService.getInt("pageUnit"));
		fileSysMntrngLogVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(fileSysMntrngLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(fileSysMntrngLogVO.getPageUnit());
		paginationInfo.setPageSize(fileSysMntrngLogVO.getPageSize());

		fileSysMntrngLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		fileSysMntrngLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		fileSysMntrngLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// ???
		if (fileSysMntrngLogVO.getSearchBgnDe() != null && fileSysMntrngLogVO.getSearchEndDe() != null) {
			if (!fileSysMntrngLogVO.getSearchBgnDe().equals("") && !fileSysMntrngLogVO.getSearchEndDe().equals("")) {
				fileSysMntrngLogVO.setSearchBgnDt(fileSysMntrngLogVO.getSearchBgnDe() + " " + fileSysMntrngLogVO.getSearchBgnHour());
				fileSysMntrngLogVO.setSearchEndDt(fileSysMntrngLogVO.getSearchEndDe() + " " + fileSysMntrngLogVO.getSearchEndHour());
			}
		}

		Map<String, Object> map = fileSysMntrngService.selectFileSysMntrngLogList(fileSysMntrngLogVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		@SuppressWarnings("unchecked")
		List<FileSysMntrngLogVO> list = (List<FileSysMntrngLogVO>) map.get("resultList");
		for (int k = 0; k < list.size(); k++) {
			FileSysMntrngLogVO logVO = list.get(k);

			if (logVO.getCreatDt() != null && !logVO.getCreatDt().equals("")) {
				if (logVO.getCreatDt().length() > 18) {
					logVO.setCreatDt(logVO.getCreatDt().substring(0, 19));
				}
			}

			list.set(k, logVO);
			//System.out.println(list.get(k).getCreatDt());
		}

		// ?????
		model.addAttribute("searchBgnHour", getTimeHH());
		// ????
		model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", list);
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngLogList";
	}

	/**
	 * ?????????????????.
	 * @param FileSysMntrngLogVO - ????????????VO
	 * @return  String - ? URL
	 *
	 * @param fileSysMntrngLogVO
	 **/
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngLog.do")
	public String selectFileSysMntrngLog(@ModelAttribute("fileSysMntrngLogVO") FileSysMntrngLogVO fileSysMntrngLogVO, ModelMap model) throws Exception {
		FileSysMntrngLogVO fileSysMntrngLog = fileSysMntrngService.selectFileSysMntrngLog(fileSysMntrngLogVO);

		if (fileSysMntrngLog.getCreatDt() != null && !fileSysMntrngLog.getCreatDt().equals("")) {
			if (fileSysMntrngLog.getCreatDt().length() > 18) {
				fileSysMntrngLog.setCreatDt(fileSysMntrngLog.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("fileSysMntrngLog", fileSysMntrngLog);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngLogDetail";
	}

	/**
	 * ????LIST?????.
	 * @return  List
	 * @throws
	 **/
	private List<ComDefaultCodeVO> getTimeHH() {
		List<ComDefaultCodeVO> listHH = new ArrayList<>();
		//HashMap hmHHMM;
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
