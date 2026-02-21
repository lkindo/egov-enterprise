package egovframework.com.sym.log.lgm.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sym.log.lgm.service.EgovSysLogService;
import egovframework.com.sym.log.lgm.service.SysLog;
import jakarta.annotation.Resource;

/**
 * ???????????? ??? ?????
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
 *   2009.03.11  ????         ????
 *   2011.07.01  ????         ??? ???sym.log -> sym.log.lgm)
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2017.09.14  ????          ???????v3.7 ?
 *   2025.07.12  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovSysLogController {

	@org.springframework.context.annotation.Lazy
	@Resource(name = "EgovSysLogService")
	private EgovSysLogService sysLogService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?????????
	 *
	 * @param sysLog
	 * @return sym log/lgm/EgovSysLogList   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/log/lgm/SelectSysLogList.do")
	public String selectSysLogInf(@ModelAttribute("searchVO") SysLog sysLog, ModelMap model) throws Exception {

		/** EgovPropertyService.sample **/
		sysLog.setPageUnit(propertiesService.getInt("pageUnit"));
		sysLog.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(sysLog.getPageIndex());
		paginationInfo.setRecordCountPerPage(sysLog.getPageUnit());
		paginationInfo.setPageSize(sysLog.getPageSize());

		sysLog.setFirstIndex(paginationInfo.getFirstRecordIndex());
		sysLog.setLastIndex(paginationInfo.getLastRecordIndex());
		sysLog.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = sysLogService.selectSysLogInf(sysLog);
		int totCnt = (Integer) map.get("resultCnt");

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("frm", sysLog);

		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/log/lgm/EgovSysLogList";

	}

	/**
	 * ??????? ??
	 *
	 * @param sysLog
	 * @param model
	 * @return sym log/lgm/EgovSysLogInqire   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/log/lgm/SelectSysLogDetail.do")
	public String selectSysLog(@ModelAttribute("searchVO") SysLog sysLog, @RequestParam("requstId") String requstId,
			ModelMap model) throws Exception {

		sysLog.setRequstId(requstId.trim());

		SysLog vo = sysLogService.selectSysLog(sysLog);
		model.addAttribute("result", vo);
		return "egovframework/com/sym/log/lgm/EgovSysLogDetail";
	}
}
