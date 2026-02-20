package egovframework.com.sym.log.clg.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sym.log.clg.service.EgovLoginLogService;
import egovframework.com.sym.log.clg.service.LoginLog;
import jakarta.annotation.Resource;

/**
 * ????????? ??? ?????
 * 
 * @author ????????? ????
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.11. ????         ????
 *   2011.07.01  ????         ??? ???sym.log -> sym.log.clg)
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.07.10  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovLoginLogController {

	@Resource(name = "EgovLoginLogService")
	private EgovLoginLogService loginLogService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	/**
	 * ????????
	 *
	 * @param loginLog
	 * @return sym log/clg/EgovLoginLogList   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/log/clg/SelectLoginLogList.do")
	public String selectLoginLogInf(@ModelAttribute("searchVO") LoginLog loginLog, ModelMap model) throws Exception {

		loginLog.setPageUnit(propertyService.getInt("pageUnit"));
		loginLog.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(loginLog.getPageIndex());
		paginationInfo.setRecordCountPerPage(loginLog.getPageUnit());
		paginationInfo.setPageSize(loginLog.getPageSize());

		loginLog.setFirstIndex(paginationInfo.getFirstRecordIndex());
		loginLog.setLastIndex(paginationInfo.getLastRecordIndex());
		loginLog.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = loginLogService.selectLoginLogInf(loginLog);
		int totCnt = (Integer) map.get("resultCnt");

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", totCnt);

		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/log/clg/EgovLoginLogList";
	}

	/**
	 * ?????? ??
	 *
	 * @param loginLog
	 * @param model
	 * @return sym log/clg/EgovLoginLogInqire   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/log/clg/SelectLoginLogDetail.do")
	public String selectLoginLog(@ModelAttribute("searchVO") LoginLog loginLog, @RequestParam("logId") String logId,
			ModelMap model) throws Exception {

		loginLog.setLogId(logId.trim());

		LoginLog vo = loginLogService.selectLoginLog(loginLog);
		model.addAttribute("result", vo);
		return "egovframework/com/sym/log/clg/EgovLoginLogDetail";
	}

}
