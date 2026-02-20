package egovframework.com.utl.sys.prm.web;

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
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.prm.service.EgovProcessMonService;
import egovframework.com.utl.sys.prm.service.ProcessMon;
import egovframework.com.utl.sys.prm.service.ProcessMonChecker;
import egovframework.com.utl.sys.prm.service.ProcessMonLogVO;
import egovframework.com.utl.sys.prm.service.ProcessMonVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??- PROCESS????????controller ?????? ???.
 *
 * ??? - PROCESS?????????, ??, ???? ?????????. - PROCESS??????? ?,
 * ??????.
 *
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:45
 *
 *          <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.9.8   ??    ????
 *  2011.8.26	???		IncludedInfo annotation ??
 *          </pre>
 **/
@Controller
public class EgovProcessMonController {

	@Resource(name = "EgovProcessMonService")
	protected EgovProcessMonService processMonService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ???PROCESS?? ???????.
	 *
	 * @param processMonVO- PROCESS?? VO
	 * @return String - ? Url
	 *
	 * @param processMonVO
	 **/
	@IncludedInfo(name = "Legacy Controller", order = 2110, gid = 90)
	@RequestMapping("/utl/sys/prm/EgovComUtlProcessMonList.do")
	public String selectProcessMonList(@ModelAttribute("searchVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		processMonVO.setPageUnit(propertyService.getInt("pageUnit"));
		processMonVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(processMonVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(processMonVO.getPageUnit());
		paginationInfo.setPageSize(processMonVO.getPageSize());

		processMonVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		processMonVO.setLastIndex(paginationInfo.getLastRecordIndex());
		processMonVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProcessMonVO> resultList = processMonService.selectProcessMonList(processMonVO);
		model.addAttribute("resultList", resultList);

		int totCnt = processMonService.selectProcessMonTotCnt(processMonVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonList";
	}

	/**
	 * PROCESS??? ???????.
	 *
	 * @param ProcessMonVO - PROCESS?? VO
	 * @return String - ? Url
	 *
	 * @param processMonVO
	 **/
	@RequestMapping("/utl/sys/prm/EgovComUtlProcessMon.do")
	public String selectProcessMon(@ModelAttribute("processMonVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		ProcessMon result = processMonService.selectProcessMon(processMonVO);
		model.addAttribute("result", result);
		// model.addAttribute("processNm",
		// ProcessMonChecker.getProcessId(vo.getProcessNm()));

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonDetail";
	}

	/**
	 * PROCESS?? ????????.
	 *
	 * @param processNm - PROCESS?? model
	 * @return String - ? Url
	 *
	 * @param processNm
	 **/
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonRegist.do")
	public String insertProcessMon(
		@Valid @ModelAttribute("processMonVO") ProcessMonVO processMonVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (processMonVO.getProcessNm() == null || processMonVO.getProcessNm().equals("") || bindingResult.hasErrors()) {
			return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonRegist";
		}

		// ?????
		processMonVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		processMonVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		processMonService.insertProcessMon(processMonVO);
		return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";

	}

	/**
	 * ?? ??PROCESS?? ????? ??.
	 *
	 * @param processNm - PROCESS?? model
	 * @return String - ? Url
	 *
	 * @param processNm
	 **/
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonModify.do")
	public String updateProcessMon(
		@Valid @ModelAttribute("processMonVO") ProcessMonVO processMonVO,
		BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA ?????(2018-12-10, ????)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			ProcessMonVO vo = processMonService.selectProcessMon(processMonVO);
			model.addAttribute("processMonVO", vo);
			return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonModify";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				ProcessMonVO vo = processMonService.selectProcessMon(processMonVO);
				model.addAttribute("processMonVO", vo);
				return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonModify";
			}

			// ?????
			processMonVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			processMonVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			processMonService.updateProcessMon(processMonVO);
			return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
		} else {
			return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
		}
	}

	/**
	 * ????PROCESS?? ????????.
	 *
	 * @param processNm - PROCESS?? model
	 * @return String - ? Url
	 *
	 * @param processNm
	 **/
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonRemove.do")
	public String deleteProcessMon(@ModelAttribute("processMonVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		processMonService.deleteProcessMon(processMonVO);
		return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
	}

	/**
	 * ??????????.
	 *
	 * @param processMon
	 * @return String
	 *
	 * @param processSttus
	 **/
	@RequestMapping("/utl/sys/prm/selectProcessSttus.do")
	public String selectProcessSttus(@ModelAttribute("processMonVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		// System.out.println("FileSysNm" + fileSysMntrngVO.getFileSysNm());
		// KISA ?? ??(2018-10-29, ????
		model.addAttribute("processSttus",
				ProcessMonChecker.getProcessId(EgovStringUtil.isNullToString(processMonVO.getProcessNm())));
		model.addAttribute("processMonVO", processMonVO);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonRegist";
	}

	/**
	 * ?? ????????????????.
	 *
	 * @param ProcessMonVO - ?? ????VO
	 * @return String - ? URL
	 *
	 * @param processMonVO
	 **/
	@RequestMapping("/utl/sys/prm/EgovComUtlProcessMonLogList.do")
	public String selectProcessMonLogList(@ModelAttribute("searchVO") ProcessMonLogVO processMonLogVO, ModelMap model)
			throws Exception {

		processMonLogVO.setPageUnit(propertyService.getInt("pageUnit"));
		processMonLogVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(processMonLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(processMonLogVO.getPageUnit());
		paginationInfo.setPageSize(processMonLogVO.getPageSize());

		processMonLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		processMonLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		processMonLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// ???
		if (processMonLogVO.getSearchBgnDe() != null && processMonLogVO.getSearchEndDe() != null) {
			if (!processMonLogVO.getSearchBgnDe().equals("") && !processMonLogVO.getSearchEndDe().equals("")) {
				processMonLogVO
						.setSearchBgnDt(processMonLogVO.getSearchBgnDe() + " " + processMonLogVO.getSearchBgnHour());
				processMonLogVO
						.setSearchEndDt(processMonLogVO.getSearchEndDe() + " " + processMonLogVO.getSearchEndHour());
			}
		}

		Map<String, Object> map = processMonService.selectProcessMonLogList(processMonLogVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		// ?????
		model.addAttribute("searchBgnHour", getTimeHH());
		// ????
		model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonLogList";
	}

	/**
	 * ?? ???????????.
	 *
	 * @param FileSysMntrngLogVO - ?? ????VO
	 * @return String - ? URL
	 *
	 * @param fileSysMntrngLogVO
	 **/
	@RequestMapping("/utl/sys/prm/EgovComUtlProcessMonLog.do")
	public String selectProcessMonLog(@ModelAttribute("processMonLogVO") ProcessMonLogVO processMonLogVO,
			ModelMap model) throws Exception {

		ProcessMonLogVO vo = processMonService.selectProcessMonLog(processMonLogVO);

		if (vo.getCreatDt() != null && !vo.getCreatDt().equals("")) {
			if (vo.getCreatDt().length() > 18) {
				vo.setCreatDt(vo.getCreatDt().substring(0, 19));
			}
		}

		model.addAttribute("result", vo);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonLogDetail";
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
