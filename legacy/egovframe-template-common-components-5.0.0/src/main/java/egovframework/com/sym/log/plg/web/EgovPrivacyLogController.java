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
 * @Description : 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 Controller ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
@Controller
public class EgovPrivacyLogController {

	@Resource(name="egovPrivacyLogService")
	private EgovPrivacyLogService privacyLogService;

	@Resource(name="propertiesService")
	protected EgovPropertyService propertyService;

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇 紐⑸줉 議고쉶
	 *
	 * @param privacyLog
	 * @return sym/log/plg/EgovPrivacyLogList
	 * @throws Exception
	 */
	@IncludedInfo(name="媛쒖씤?뺣낫議고쉶濡쒓렇愿由?, listUrl="/sym/log/plg/SelectPrivacyLogList.do", order = 1085 ,gid = 60)
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
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇 ?곸꽭 議고쉶
	 *
	 * @param privacyLog
	 * @param model
	 * @return sym/log/plg/EgovPrivacyLogInqire
	 * @throws Exception
	 */
	@RequestMapping(value="/sym/log/plg/SelectPrivacyLogDetail.do")
	public String selectWebLog(@ModelAttribute("searchVO") PrivacyLog privacyLog,
			ModelMap model) throws Exception{

		model.addAttribute("result", privacyLogService.selectPrivacyLog(privacyLog));

		return "egovframework/com/sym/log/plg/EgovPrivacyLogDetail";
	}

}
