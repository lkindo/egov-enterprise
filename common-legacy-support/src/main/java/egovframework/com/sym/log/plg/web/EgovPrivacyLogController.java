package egovframework.com.sym.log.plg.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sym.log.plg.service.EgovPrivacyLogService;
import egovframework.com.sym.log.plg.service.PrivacyLog;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovPrivacyLogController.java
 * @Description : ?? ????????? ? Controller ?????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2014.09.11	???????	???
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 **/
@Controller
public class EgovPrivacyLogController {

	@Resource(name="egovPrivacyLogService")
	private EgovPrivacyLogService privacyLogService;

	@Resource(name="propertiesService")
	protected EgovPropertyService propertyService;

	/**
	 * ?????????
	 *
	 * @param privacyLog
	 * @return sym log/plg/EgovPrivacyLogList   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value="/sym/log/plg/SelectPrivacyLogList.do")
	public String selectPrivacyLogList(@ModelAttribute("searchVO") PrivacyLog privacyLog,
			ModelMap model) throws Exception{

		privacyLog.setPageUnit(propertyService.getInt("pageUnit"));
		privacyLog.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(privacyLog.getPageIndex());
		paginationInfo.setRecordCountPerPage(privacyLog.getPageUnit());
		paginationInfo.setPageSize(privacyLog.getPageSize());

		privacyLog.setFirstIndex(paginationInfo.getFirstRecordIndex());
		privacyLog.setLastIndex(paginationInfo.getLastRecordIndex());
		privacyLog.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = privacyLogService.selectPrivacyLogList(privacyLog);
		int totalCount = Integer.parseInt((String)map.get("resultCnt"));

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totalCount);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/log/plg/EgovPrivacyLogList";
	}

	/**
	 * ??????? ??
	 *
	 * @param privacyLog
	 * @param model
	 * @return sym log/plg/EgovPrivacyLogInqire   
	 * @throws Exception
	 */
	@RequestMapping(value="/sym/log/plg/SelectPrivacyLogDetail.do")
	public String selectWebLog(@ModelAttribute("searchVO") PrivacyLog privacyLog,
			ModelMap model) throws Exception{

		model.addAttribute("result", privacyLogService.selectPrivacyLog(privacyLog));

		return "egovframework/com/sym/log/plg/EgovPrivacyLogDetail";
	}

}
