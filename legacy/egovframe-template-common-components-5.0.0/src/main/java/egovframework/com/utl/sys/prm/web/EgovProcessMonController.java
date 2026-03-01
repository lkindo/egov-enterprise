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
 * 媛쒖슂 - PROCESS紐⑤땲?곕쭅?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - PROCESS紐⑤땲?곕쭅??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - PROCESS紐⑤땲?곕쭅??議고쉶湲곕뒫? 紐⑸줉議고쉶,
 * ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:45
 *
 *          <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.9.8   諛뺤쥌??    理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *          </pre>
 */
@Controller
public class EgovProcessMonController {

	@Resource(name = "EgovProcessMonService")
	protected EgovProcessMonService processMonService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜?議고쉶 ?쒕떎.
	 *
	 * @param processMonVO- PROCESS紐⑤땲?곕쭅 VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param processMonVO
	 */
	@IncludedInfo(name = "?꾨줈?몄뒪紐⑤땲?곕쭅", order = 2110, gid = 90)
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
	 * PROCESS紐⑤땲?곕쭅?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 *
	 * @param ProcessMonVO - PROCESS紐⑤땲?곕쭅 VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param processMonVO
	 */
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
	 * PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param processNm
	 */
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonRegist.do")
	public String insertProcessMon(
		@Valid @ModelAttribute("processMonVO") ProcessMonVO processMonVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (processMonVO.getProcessNm() == null || processMonVO.getProcessNm().equals("") || bindingResult.hasErrors()) {
			return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonRegist";
		}

		// ?꾩씠???ㅼ젙
		processMonVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		processMonVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		processMonService.insertProcessMon(processMonVO);
		return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";

	}

	/**
	 * 湲??깅줉 ??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??섏젙 ?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param processNm
	 */
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonModify.do")
	public String updateProcessMon(
		@Valid @ModelAttribute("processMonVO") ProcessMonVO processMonVO,
		BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

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

			// ?꾩씠???ㅼ젙
			processMonVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			processMonVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			processMonService.updateProcessMon(processMonVO);
			return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
		} else {
			return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
		}
	}

	/**
	 * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜???젣?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param processNm
	 */
	@RequestMapping(value = "/utl/sys/prm/EgovComUtlProcessMonRemove.do")
	public String deleteProcessMon(@ModelAttribute("processMonVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		processMonService.deleteProcessMon(processMonVO);
		return "forward:/utl/sys/prm/EgovComUtlProcessMonList.do";
	}

	/**
	 * ?꾨줈?몄뒪???곹깭瑜?議고쉶?쒕떎.
	 *
	 * @param processMon
	 * @return String
	 *
	 * @param processSttus
	 */
	@RequestMapping("/utl/sys/prm/selectProcessSttus.do")
	public String selectProcessSttus(@ModelAttribute("processMonVO") ProcessMonVO processMonVO, ModelMap model)
			throws Exception {

		// System.out.println("FileSysNm" + fileSysMntrngVO.getFileSysNm());
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		model.addAttribute("processSttus",
				ProcessMonChecker.getProcessId(EgovStringUtil.isNullToString(processMonVO.getProcessNm())));
		model.addAttribute("processMonVO", processMonVO);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonRegist";
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param ProcessMonVO - ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 VO
	 * @return String - 由ы꽩 URL
	 *
	 * @param processMonVO
	 */
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

		// 議고쉶湲곌컙?ㅼ젙
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

		// 議고쉶?쒖옉??
		model.addAttribute("searchBgnHour", getTimeHH());
		// 議고쉶醫낅즺??
		model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/prm/EgovComUtlProcessMonLogList";
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param FileSysMntrngLogVO - ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 VO
	 * @return String - 由ы꽩 URL
	 *
	 * @param fileSysMntrngLogVO
	 */
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
	 * ?쒓컙??LIST瑜?諛섑솚?쒕떎.
	 *
	 * @return List
	 * @throws
	 */
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
