package egovframework.com.sym.log.clg.web;

import java.util.HashMap;
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
 * ?묒냽濡쒓렇?뺣낫瑜?愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11. ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(sym.log -> sym.log.clg)
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.07.10  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovLoginLogController {

	@Resource(name = "EgovLoginLogService")
	private EgovLoginLogService loginLogService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	/**
	 * 濡쒓렇??濡쒓렇 紐⑸줉 議고쉶
	 *
	 * @param loginLog
	 * @return sym/log/clg/EgovLoginLogList
	 * @throws Exception
	 */
	@IncludedInfo(name = "?묒냽濡쒓렇愿由?, order = 1080, gid = 60)
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
	 * 濡쒓렇??濡쒓렇 ?곸꽭 議고쉶
	 *
	 * @param loginLog
	 * @param model
	 * @return sym/log/clg/EgovLoginLogInqire
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
