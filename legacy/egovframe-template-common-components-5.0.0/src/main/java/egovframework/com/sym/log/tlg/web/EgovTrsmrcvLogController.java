package egovframework.com.sym.log.tlg.web;

import java.util.List;
import java.util.Map;

import org.apache.commons.collections4.MapUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.log.tlg.service.EgovTrsmrcvLogService;
import egovframework.com.sym.log.tlg.service.TrsmrcvLog;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovTrsmrcvLogController.java
 * @Description : ?≪닔??濡쒓렇?뺣낫瑜?愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.tlg)
 *    2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */

@Controller
public class EgovTrsmrcvLogController {

	@Resource(name = "EgovTrsmrcvLogService")
	private EgovTrsmrcvLogService trsmrcvLogService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
     * ?≪닔??濡쒓렇 紐⑸줉 議고쉶
     *
     * @param trsmrcvLog
     * @return sym/log/tlg/EgovTrsmrcvLogList
     * @throws Exception
     */
    @IncludedInfo(name = "???섏떊濡쒓렇愿由?, listUrl = "/sym/log/tlg/SelectTrsmrcvLogList.do", order = 1050, gid = 60)
    @RequestMapping(value = "/sym/log/tlg/SelectTrsmrcvLogList.do")
    public String selectTrsmrcvLogInf(@ModelAttribute("searchVO") TrsmrcvLog trsmrcvLog, ModelMap model)
            throws Exception {

		trsmrcvLog.setPageUnit(propertyService.getInt("pageUnit"));
		trsmrcvLog.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(trsmrcvLog.getPageIndex());
		paginationInfo.setRecordCountPerPage(trsmrcvLog.getPageUnit());
		paginationInfo.setPageSize(trsmrcvLog.getPageSize());

		trsmrcvLog.setFirstIndex(paginationInfo.getFirstRecordIndex());
		trsmrcvLog.setLastIndex(paginationInfo.getLastRecordIndex());
		trsmrcvLog.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = trsmrcvLogService.selectTrsmrcvLogInf(trsmrcvLog);
		int totCnt = MapUtils.getIntValue(map, "resultCnt");

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", totCnt);

		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/log/tlg/EgovTrsmrcvLogList";
	}

	/**
	 * ?≪닔??濡쒓렇 ?곸꽭 議고쉶
	 *
	 * @param trsmrcvLog
	 * @param model
	 * @return sym/log/tlg/EgovTrsmrcvLogInqire
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/log/tlg/InqireTrsmrcvLog.do")
	public String selectTrsmrcvLog(@ModelAttribute("searchVO") TrsmrcvLog trsmrcvLog, @RequestParam("requstId") String requstId, ModelMap model) throws Exception {

		trsmrcvLog.setRequstId(requstId.trim());

		TrsmrcvLog vo = trsmrcvLogService.selectTrsmrcvLog(trsmrcvLog);
		model.addAttribute("result", vo);
		return "egovframework/com/sym/log/tlg/EgovTrsmrcvLogInqire";
	}

	/**
	 * ?≪닔??濡쒓렇 ?뚯뒪???붾㈃
     *
     * @param trsmrcvLog
     * @return sym/log/slg/EgovSysHistRegist
     * @throws Exception
     */
    @RequestMapping(value = "/sym/log/tlg/AddTrsmrcvLog.do")
    public String addTrsmrcvLog(@ModelAttribute("searchVO") TrsmrcvLog trsmrcvLog, ModelMap model) throws Exception {
        ComDefaultCodeVO vo = new ComDefaultCodeVO();
        vo.setCodeId("COM002");
        List<CmmnDetailCode> resultList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("resultList", resultList);
        return "egovframework/com/sym/log/tlg/EgovTrsmrcvLogRegist";
    }

	/**
	 * ?≪닔??濡쒓렇 ?뚯뒪??
	 *
	 * @param trsmrcvLog
	 * @return forward:/sym/log/tlg/SelectTrsmrcvLogList.do
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/log/tlg/InsertTrsmrcvLog.do")
	public String insertTrsmrcvLog(@ModelAttribute("searchVO") TrsmrcvLog trsmrcvLog, SessionStatus status) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			trsmrcvLog.setRqesterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			trsmrcvLogService.logInsertTrsmrcvLog(trsmrcvLog);
		}

		return "forward:/sym/log/tlg/SelectTrsmrcvLogList.do";
	}

}
