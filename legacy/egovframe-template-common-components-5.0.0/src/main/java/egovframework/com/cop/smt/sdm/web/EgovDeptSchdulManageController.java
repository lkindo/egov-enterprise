package egovframework.com.cop.smt.sdm.web;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO;
import egovframework.com.cop.smt.sdm.service.EgovDeptSchdulManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 遺?쒖씪?뺢?由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *	 2011.09.01  ?뺤쭊??         10??二쇰퀎 ?щ젰 ?뚯씠釉붿뿉 ?좎쭨媛 ?댁긽?섍쾶 ?섏????섏젙??
 *   2025.06.11  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovDeptSchdulManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovDeptSchdulManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovDeptSchdulManageService")
	private EgovDeptSchdulManageService egovDeptSchdulManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * 媛쒕퀎 諛고룷??硫붿씤硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param model
	 * @return "/cop/smt/sdm/EgovMain"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/cop/smt/sdm/EgovMain";
	}

	/**
	 * 硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param model
	 * @return "/cop/smt/sdm/EgovLeft"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/cop/smt/sdm/EgovLeft";
	}

	/**
	 * 遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param model
	 * @return "uss/olp/mgt/EgovDeptSchdulManageAuthorGroupPopup"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup.do")
	public String egovMeetingManageLisAuthorGroupPopupPost(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageAuthorGroupPopup(searchVO);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup";
	}

	/**
	 * ?뚯썝紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param model
	 * @return "/uss/olp/mgt/EgovMeetingManageLisEmpLyrPopup"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageEmpLyrPopup.do")
	public String egovMeetingManageLisEmpLyrPopupPost(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageEmpLyrPopup(searchVO);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageEmpLyrPopup";
	}

	/**
	 * 硫붿씤?섏씠吏/遺?쒖씪?뺢?由ъ“??
	 * 
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageMainList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageMainList.do")
	public String egovDeptSchdulManageList(@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			loginVO = new LoginVO();
		}

		Map<String, String> hmParam = new HashMap<>();

		hmParam.put("uniqId", loginVO.getUniqId());

		List<EgovMap> reusltList = egovDeptSchdulManageService.selectDeptSchdulManageMainList(hmParam);

		model.addAttribute("resultList", reusltList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageMainList";

	}

	/**
	 * ?쇱?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/cop/smt/dsm/EgovDiaryManageList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageListPopup.do")
	public String egovDeptSchdulManageListPopup(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovDeptSchdulManageService.selectDeptSchdulManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageListPopup";
	}

	/**
	 * 遺?쒖씪???쇰퀎) 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageDailyList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageDailyList.do")
	public String egovDeptSchdulManageDailyList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// 寃???좎?
		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		// 怨듯넻肄붾뱶 遺?쒖씪?뺤쥌瑜?
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		/* *****************************************************************
    	// 罹섎윴???ㅼ젙 濡쒖쭅
		****************************************************************** */
		Calendar calNow = Calendar.getInstance();

		String strYear = commandMap.get("year");
		String strMonth = commandMap.get("month");
		String strDay = commandMap.get("day");
		String strSearchDay = "";
		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDay = calNow.get(Calendar.DATE);

		if (strYear != null) {
			iNowYear = Integer.parseInt(strYear);
			iNowMonth = Integer.parseInt(strMonth);
			iNowDay = Integer.parseInt(strDay);
		}

		strSearchDay = Integer.toString(iNowYear);
		strSearchDay += dateTypeIntForString(iNowMonth + 1);
		strSearchDay += dateTypeIntForString(iNowDay);

		commandMap.put("searchMode", "DAILY");
		commandMap.put("searchDay", strSearchDay);

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("day", iNowDay);

		List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageRetrieve(commandMap);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageDailyList";
	}

	/**
	 * 遺?쒖씪??二쇨컙蹂? 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageWeekList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageWeekList.do")
	public String egovDeptSchdulManageWeekList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// ?쇱젙援щ텇 寃???좎?
		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		// 怨듯넻肄붾뱶 遺?쒖씪?뺤쥌瑜?
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		/* *****************************************************************
    	// 罹섎윴???ㅼ젙 濡쒖쭅
		****************************************************************** */
		Calendar calNow = Calendar.getInstance();
		Calendar calBefore = Calendar.getInstance();
		Calendar calNext = Calendar.getInstance();

		String strYear = commandMap.get("year");
		String strMonth = commandMap.get("month");
		String strWeek = commandMap.get("week");

		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDate = calNow.get(Calendar.DATE);
		int iNowWeek = 0;

		if (strYear != null) {
			iNowYear = Integer.parseInt(strYear);
			iNowMonth = Integer.parseInt(strMonth);
			iNowWeek = Integer.parseInt(strWeek);
		}

		// ?곕룄/???뗮똿
		calNow.set(iNowYear, iNowMonth, 1);
		calBefore.set(iNowYear, iNowMonth, 1);
		calNext.set(iNowYear, iNowMonth, 1);

		calBefore.add(Calendar.MONTH, -1);
		calNext.add(Calendar.MONTH, +1);

//		int startDay = calNow.getMinimum(Calendar.DATE);
		int endDay = calNow.getActualMaximum(Calendar.DAY_OF_MONTH);
		int startWeek = calNow.get(Calendar.DAY_OF_WEEK);

		List<List<String>> listWeekGrop = new ArrayList<>();
		List<String> listWeekDate = new ArrayList<>();

		String sUseDate = "";

		calBefore.add(Calendar.DATE, calBefore.getActualMaximum(Calendar.DAY_OF_MONTH) - (startWeek - 1));
		for (int i = 1; i < startWeek; i++) {
			sUseDate = Integer.toString(calBefore.get(Calendar.YEAR));
			sUseDate += dateTypeIntForString(calBefore.get(Calendar.MONTH) + 1);
			sUseDate += dateTypeIntForString(calBefore.get(Calendar.DATE));

			listWeekDate.add(sUseDate);
			calBefore.add(Calendar.DATE, +1);
		}

		int iBetweenCount = startWeek;

		// 二쇰퀎濡??먮Ⅸ?? BETWEEN 援ы븯湲?
		for (int i = 1; i <= endDay; i++) {
			sUseDate = Integer.toString(iNowYear);
			// sUseDate += Integer.toString(iNowMonth).length() == 1 ? "0" +
			// Integer.toString(iNowMonth+1) : Integer.toString(iNowMonth+1);
			// (2011.9.1 ?섏젙?ы빆) 10?붿쓽 二쇰퀎 ?좎쭨媛 ?댁긽?섍쾶 ?섏???LeaderSchedule 蹂닿퀬 ?섏젙?? ?꾩쓽 肄붾뱶媛 ?먮옒 肄붾뱶
			sUseDate += Integer.toString(iNowMonth + 1).length() == 1 ? "0" + Integer.toString(iNowMonth + 1)
					: Integer.toString(iNowMonth + 1);
			sUseDate += Integer.toString(i).length() == 1 ? "0" + Integer.toString(i) : Integer.toString(i);

			listWeekDate.add(sUseDate);

			if (iBetweenCount % 7 == 0) {
				listWeekGrop.add(listWeekDate);
				listWeekDate = new ArrayList<>();

				if (strYear == null && i < iNowDate) {
					iNowWeek++;

				}
			}

			// 誘몄?留?7???먮룞怨꾩궛
			if (i == endDay) {

				for (int j = listWeekDate.size(); j < 7; j++) {
					String sUseNextDate = Integer.toString(calNext.get(Calendar.YEAR));
					sUseNextDate += dateTypeIntForString(calNext.get(Calendar.MONTH) + 1);
					sUseNextDate += dateTypeIntForString(calNext.get(Calendar.DATE));
					listWeekDate.add(sUseNextDate);
					calNext.add(Calendar.DATE, +1);
				}

				listWeekGrop.add(listWeekDate);
			}

			iBetweenCount++;
		}

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("week", iNowWeek);

		model.addAttribute("listWeekGrop", listWeekGrop);

		List<String> listWeek = listWeekGrop.get(iNowWeek);
		commandMap.put("searchMode", "WEEK");
		commandMap.put("schdulBgnde", listWeek.get(0));
		commandMap.put("schdulEndde", listWeek.get(listWeek.size() - 1));

		List<?> resultList = egovDeptSchdulManageService.selectDeptSchdulManageRetrieve(commandMap);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageWeekList";
	}

	/**
	 * 遺?쒖씪???붾퀎) 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageMonthList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageMonthList.do")
	public String egovDeptSchdulManageMonthList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// ?쇱젙援щ텇 寃???좎?
		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		java.util.Calendar cal = java.util.Calendar.getInstance();

		String sYear = commandMap.get("year");
		String sMonth = commandMap.get("month");

		int iYear = cal.get(java.util.Calendar.YEAR);
		int iMonth = cal.get(java.util.Calendar.MONTH);
//		int iDate = cal.get(java.util.Calendar.DATE);

		// 寃???ㅼ젙
		String sSearchDate = "";
		if (sYear == null || sMonth == null) {
			sSearchDate += Integer.toString(iYear);
			sSearchDate += Integer.toString(iMonth + 1).length() == 1 ? "0" + Integer.toString(iMonth + 1)
					: Integer.toString(iMonth + 1);
		} else {
			iYear = Integer.parseInt(sYear);
			iMonth = Integer.parseInt(sMonth);
			sSearchDate += sYear;
			sSearchDate += Integer.toString(iMonth + 1).length() == 1 ? "0" + Integer.toString(iMonth + 1)
					: Integer.toString(iMonth + 1);
		}

		commandMap.put("searchMonth", sSearchDate);

		// 怨듯넻肄붾뱶 遺?쒖씪?뺤쥌瑜?
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		commandMap.put("searchMode", "MONTH");
		List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageRetrieve(commandMap);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageMonthList";
	}

	/**
	 * 遺?쒖씪??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList"
	 */
	@IncludedInfo(name = "遺?쒖씪?뺢?由?, order = 320, gid = 40)
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageList.do")
	public String egovDeptSchdulManageList() {
		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList";
	}

	/**
	 * 遺?쒖씪??紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param deptSchdulManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageDetail.do")
	public String egovDeptSchdulManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			DeptSchdulManageVO deptSchdulManageVO, @RequestParam Map<String, String> commandMap, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageDetail";

		String sCmd = commandMap.get("cmd");

		if ("del".equals(sCmd)) {
			egovDeptSchdulManageService.deleteDeptSchdulManage(deptSchdulManageVO);
			sLocationUrl = "redirect:/cop/smt/sdm/EgovDeptSchdulManageList.do";
		} else {

			// 怨듯넻肄붾뱶 以묒슂??議고쉶
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM019");
			List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("schdulIpcrCode", listComCode);
			// 怨듯넻肄붾뱶 ?쇱젙援щ텇 議고쉶
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM030");
			listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("schdulSe", listComCode);
			// 怨듯넻肄붾뱶 諛섎났援щ텇 議고쉶
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM031");
			listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("reptitSeCode", listComCode);

			List<EgovMap> resultList = egovDeptSchdulManageService.selectDeptSchdulManageDetail(deptSchdulManageVO);
			model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * 遺?쒖씪?뺣? ?섏젙 ??
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageModify.do")
	public String deptSchdulManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			DeptSchdulManageVO deptSchdulManageVO, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageModify";

		// 怨듯넻肄붾뱶 以묒슂??議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM019");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulIpcrCode", listComCode);
		// 怨듯넻肄붾뱶 ?쇱젙援щ텇 議고쉶
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);
		// 怨듯넻肄붾뱶 諛섎났援щ텇 議고쉶
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM031");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("reptitSeCode", listComCode);

		// ?쇱젙?쒖옉?쇱옄(??
		model.addAttribute("schdulBgndeHH", getTimeHH());
		// ?쇱젙?쒖옉?쇱옄(遺?
		model.addAttribute("schdulBgndeMM", getTimeMM());
		// ?쇱젙醫낅즺?쇱옄(??
		model.addAttribute("schdulEnddeHH", getTimeHH());
		// ?쇱젙?뺣즺?쇱옄(遺?
		model.addAttribute("schdulEnddeMM", getTimeMM());

		DeptSchdulManageVO resultDeptSchdulManageVOReuslt = egovDeptSchdulManageService
				.selectDeptSchdulManageDetailVO(deptSchdulManageVO);

		String sSchdulBgnde = resultDeptSchdulManageVOReuslt.getSchdulBgnde();
		String sSchdulEndde = resultDeptSchdulManageVOReuslt.getSchdulEndde();

		resultDeptSchdulManageVOReuslt.setSchdulBgndeYYYMMDD(
				sSchdulBgnde.substring(0, 4) + "-" + sSchdulBgnde.substring(4, 6) + "-" + sSchdulBgnde.substring(6, 8));
		resultDeptSchdulManageVOReuslt.setSchdulBgndeHH(sSchdulBgnde.substring(8, 10));
		resultDeptSchdulManageVOReuslt.setSchdulBgndeMM(sSchdulBgnde.substring(10, 12));

		resultDeptSchdulManageVOReuslt.setSchdulEnddeYYYMMDD(
				sSchdulEndde.substring(0, 4) + "-" + sSchdulEndde.substring(4, 6) + "-" + sSchdulEndde.substring(6, 8));
		resultDeptSchdulManageVOReuslt.setSchdulEnddeHH(sSchdulEndde.substring(8, 10));
		resultDeptSchdulManageVOReuslt.setSchdulEnddeMM(sSchdulEndde.substring(10, 12));

		model.addAttribute("deptSchdulManageVO", resultDeptSchdulManageVOReuslt);

		return sLocationUrl;
	}

	/**
	 * 遺?쒖씪?뺣? ?섏젙 泥섎━ ?쒕떎.
	 * 
	 * @param multiRequest
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageModifyActor.do")
	public String deptSchdulManageModifyActor(final MultipartHttpServletRequest multiRequest,
			@RequestParam Map<String, String> commandMap,
			@Valid @ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageModify";

		String sCmd = commandMap.get("cmd");

		if ("save".equals(sCmd)) {
			if (bindingResult.hasErrors()) {

				// 怨듯넻肄붾뱶 以묒슂??議고쉶
				ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
				voComCode.setCodeId("COM019");
				List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
				model.addAttribute("schdulIpcrCode", listComCode);
				// 怨듯넻肄붾뱶 ?쇱젙援щ텇 議고쉶
				voComCode = new ComDefaultCodeVO();
				voComCode.setCodeId("COM030");
				listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
				model.addAttribute("schdulSe", listComCode);
				// 怨듯넻肄붾뱶 諛섎났援щ텇 議고쉶
				voComCode = new ComDefaultCodeVO();
				voComCode.setCodeId("COM031");
				listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
				model.addAttribute("reptitSeCode", listComCode);

				// ?쇱젙?쒖옉?쇱옄(??
				model.addAttribute("schdulBgndeHH", getTimeHH());
				// ?쇱젙?쒖옉?쇱옄(遺?
				model.addAttribute("schdulBgndeMM", getTimeMM());
				// ?쇱젙醫낅즺?쇱옄(??
				model.addAttribute("schdulEnddeHH", getTimeHH());
				// ?쇱젙?뺣즺?쇱옄(遺?
				model.addAttribute("schdulEnddeMM", getTimeMM());

				return sLocationUrl;
			}
			/*
			 * ***************************************************************** // ?꾩씠???ㅼ젙
			 */
			deptSchdulManageVO.setFrstRegisterId(loginVO.getUniqId());
			deptSchdulManageVO.setLastUpdusrId(loginVO.getUniqId());
			/*
			 * ***************************************************************** // 泥⑤??뚯씪 愿??
			 * ID ?앹꽦 start....
			 */
			String atchFileId = deptSchdulManageVO.getAtchFileId();

			// final Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = commandMap.get("atchFileAt");
				if ("N".equals(atchFileAt) || "".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					deptSchdulManageVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID
				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			/*
			 * ***************************************************************** // ?쇱젙愿由ъ젙蹂?
			 * ?낅뜲?댄듃 泥섎━
			 */
			egovDeptSchdulManageService.updateDeptSchdulManage(deptSchdulManageVO);
			sLocationUrl = "redirect:/cop/smt/sdm/EgovDeptSchdulManageList.do";
		}

		return sLocationUrl;
	}

	/**
	 * 遺?쒖씪?뺣? ?깅줉?쒕떎. / ?깅줉 珥덇린?섏씠吏
	 * 
	 * @param searchVO
	 * @param deptSchdulManageVO
	 * @param model
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageRegist.do")
	public String deptSchdulManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageRegist";

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 怨듯넻肄붾뱶 以묒슂??議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM019");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulIpcrCode", listComCode);
		// 怨듯넻肄붾뱶 ?쇱젙援щ텇 議고쉶
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);
		// 怨듯넻肄붾뱶 諛섎났援щ텇 議고쉶
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM031");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("reptitSeCode", listComCode);

		// ?쇱젙?쒖옉?쇱옄(??
		model.addAttribute("schdulBgndeHH", getTimeHH());
		// ?쇱젙?쒖옉?쇱옄(遺?
		model.addAttribute("schdulBgndeMM", getTimeMM());
		// ?쇱젙醫낅즺?쇱옄(??
		model.addAttribute("schdulEnddeHH", getTimeHH());
		// ?쇱젙?뺣즺?쇱옄(遺?
		model.addAttribute("schdulEnddeMM", getTimeMM());

		return sLocationUrl;

	}

	/**
	 * 遺?쒖씪?뺣? ?깅줉?쒕떎. / ?깅줉 泥섎━ ?쒕떎.
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param commandMap
	 * @param deptSchdulManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/cop/smt/sdm/EgovDeptSchdulManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageRegistActor.do")
	public String deptSchdulManageRegistActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {

				return sLocationUrl;
			}

			// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
			List<FileVO> fvoList = null;
			String atchFileId = "";

			// final Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
			}

			// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
			deptSchdulManageVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			// ?꾩씠???ㅼ젙
			deptSchdulManageVO
					.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			deptSchdulManageVO
					.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovDeptSchdulManageService.insertDeptSchdulManage(deptSchdulManageVO);
			sLocationUrl = "redirect:/cop/smt/sdm/EgovDeptSchdulManageList.do";
		}

		return sLocationUrl;

	}

	/**
	 * ?쒓컙??LIST瑜?諛섑솚?쒕떎.
	 * 
	 * @return List
	 * @throws
	 */
	@SuppressWarnings("unused")
	private List<ComDefaultCodeVO> getTimeHH() {
    	ArrayList<ComDefaultCodeVO> listHH = new ArrayList<>();
		HashMap<?, ?> hmHHMM;
		for (int i = 0; i <= 24; i++) {
			String sHH = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sHH = "0" + strI;
			} else {
				sHH = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sHH);
			codeVO.setCodeNm(sHH);

			listHH.add(codeVO);
		}

		return listHH;
	}

	/**
	 * 遺꾩쓣 LIST瑜?諛섑솚?쒕떎.
	 * 
	 * @return List
	 * @throws
	 */
	@SuppressWarnings({ "rawtypes", "unused", "unchecked" })
	private List getTimeMM() {
		ArrayList listMM = new ArrayList();
		HashMap hmHHMM;
		for (int i = 0; i <= 60; i++) {

			String sMM = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sMM = "0" + strI;
			} else {
				sMM = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sMM);
			codeVO.setCodeNm(sMM);

			listMM.add(codeVO);
		}
		return listMM;
	}

	/**
	 * 0??遺숈뿬 諛섑솚
	 * 
	 * @return String
	 * @throws
	 */
	public String dateTypeIntForString(int iInput) {
		String sOutput = "";
		if (Integer.toString(iInput).length() == 1) {
			sOutput = "0" + Integer.toString(iInput);
		} else {
			sOutput = Integer.toString(iInput);
		}

		return sOutput;
	}

}