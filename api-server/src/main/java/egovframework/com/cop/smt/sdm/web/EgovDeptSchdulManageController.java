package egovframework.com.cop.smt.sdm.web;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.company.project.service.schedule.EgovScheduleService;
import com.company.project.service.schedule.dto.ScheduleDto;
import com.company.project.web.adapter.ScheduleAdapter;

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
import egovframework.com.uss.umt.service.DeptManageVO;
import egovframework.com.uss.umt.service.EgovDeptManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 부서일정관리를 처리하는 Controller Class 구현
 * Refactored to use EgovScheduleService (JPA)
 */
@Controller("egovDeptSchdulManageController")
@RequiredArgsConstructor
public class EgovDeptSchdulManageController {

	// private static final Logger LOGGER =
	// LoggerFactory.getLogger(EgovDeptSchdulManageController.class);

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	private final EgovScheduleService egovScheduleService;

    @Resource(name = "egovDeptManageService")
    private EgovDeptManageService egovDeptManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// 첨부파일 관련
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * 개별 배포시 메인메뉴를 조회한다.
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
	 * 메뉴를 조회한다.
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
	 * 부서목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup.do")
	public String egovMeetingManageLisAuthorGroupPopupPost(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

        DeptManageVO deptManageVO = new DeptManageVO();
        deptManageVO.setSearchCondition(searchVO.getSearchCondition());
        deptManageVO.setSearchKeyword(searchVO.getSearchKeyword());

        // Pagination logic
        deptManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
        deptManageVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(deptManageVO.getPageUnit());
		paginationInfo.setPageSize(deptManageVO.getPageSize());

        deptManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		deptManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		deptManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
        deptManageVO.setPageIndex(searchVO.getPageIndex());

        // Use selectDeptManageListPaged
        List<DeptManageVO> resultList = egovDeptManageService.selectDeptManageListPaged(deptManageVO);
        int totCnt = egovDeptManageService.selectDeptManageListTotCnt(deptManageVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", resultList);
        model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup";
	}

	/**
	 * 회원목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageEmpLyrPopup.do")
	public String egovMeetingManageLisEmpLyrPopupPost(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		List<Map<String, Object>> resultList = egovScheduleService.selectEmpLyrPopup(searchVO);
		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageEmpLyrPopup";
	}

	/**
	 * 메인페이지/부서일정관리조회
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageMainList.do")
	public String egovDeptSchdulManageMainList(@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String orgnztId = (loginVO != null) ? loginVO.getOrgnztId() : "";

		// Top 5 Dept Schedules
		Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList("2", orgnztId,
				PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "schdulBgnde")));

		List<DeptSchdulManageVO> resultList = pageResult.stream()
				.map(ScheduleAdapter::toDeptVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageMainList";
	}

	/**
	 * 일지관리 목록을 조회한다.
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

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String orgnztId = (loginVO != null) ? loginVO.getOrgnztId() : "";

		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize(),
				Sort.by(Sort.Direction.DESC, "schdulBgnde"));

		Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList("2", orgnztId, pageable);

		List<DeptSchdulManageVO> resultList = pageResult.stream()
				.map(ScheduleAdapter::toDeptVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);
		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageListPopup";
	}

	/**
	 * 부서일정(일별) 목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageDailyList.do")
	public String egovDeptSchdulManageDailyList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// 검색 유지
		model.addAttribute("searchKeyword", commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition", commandMap.get("searchCondition"));

		// 공통코드 부서일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		Calendar calNow = Calendar.getInstance();
		String strYear = commandMap.get("year");
		String strMonth = commandMap.get("month");
		String strDay = commandMap.get("day");

		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDay = calNow.get(Calendar.DATE);

		if (strYear != null) {
			iNowYear = Integer.parseInt(strYear);
			iNowMonth = Integer.parseInt(strMonth);
			iNowDay = Integer.parseInt(strDay);
		}

		String strSearchDay = Integer.toString(iNowYear) + dateTypeIntForString(iNowMonth + 1)
				+ dateTypeIntForString(iNowDay);

		commandMap.put("searchMode", "DAILY");
		commandMap.put("searchDay", strSearchDay);

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("day", iNowDay);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String orgnztId = (loginVO != null) ? loginVO.getOrgnztId() : "";

		String start = strSearchDay + "000000";
		String end = strSearchDay + "235959";

		List<ScheduleDto> dtoList = egovScheduleService.getScheduleListByDateRange("2", orgnztId, start, end);
		List<DeptSchdulManageVO> resultList = dtoList.stream()
				.map(ScheduleAdapter::toDeptVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageDailyList";
	}

	/**
	 * 부서일정(주간별) 목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageWeekList.do")
	public String egovDeptSchdulManageWeekList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// 검색 유지
		model.addAttribute("searchKeyword", commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition", commandMap.get("searchCondition"));

		// 공통코드 부서일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

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

		calNow.set(iNowYear, iNowMonth, 1);
		calBefore.set(iNowYear, iNowMonth, 1);
		calNext.set(iNowYear, iNowMonth, 1);

		calBefore.add(Calendar.MONTH, -1);
		calNext.add(Calendar.MONTH, +1);

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

		for (int i = 1; i <= endDay; i++) {
			sUseDate = Integer.toString(iNowYear);
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
		String schdulBgnde = listWeek.get(0);
		String schdulEndde = listWeek.get(listWeek.size() - 1);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String orgnztId = (loginVO != null) ? loginVO.getOrgnztId() : "";

		String start = schdulBgnde + "000000";
		String end = schdulEndde + "235959";

		List<ScheduleDto> dtoList = egovScheduleService.getScheduleListByDateRange("2", orgnztId, start, end);
		List<DeptSchdulManageVO> resultList = dtoList.stream()
				.map(ScheduleAdapter::toDeptVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageWeekList";
	}

	/**
	 * 부서일정(월별) 목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageMonthList.do")
	public String egovDeptSchdulManageMonthList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// 검색 유지
		model.addAttribute("searchKeyword", commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition", commandMap.get("searchCondition"));

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String sYear = commandMap.get("year");
		String sMonth = commandMap.get("month");
		int iYear = cal.get(java.util.Calendar.YEAR);
		int iMonth = cal.get(java.util.Calendar.MONTH);

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

		// 공통코드 부서일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String orgnztId = (loginVO != null) ? loginVO.getOrgnztId() : "";

		String start = sSearchDate + "010000";
		// Calculate last day of month
		Calendar calEnd = Calendar.getInstance();
		calEnd.set(iYear, iMonth, 1);
		int lastDay = calEnd.getActualMaximum(Calendar.DAY_OF_MONTH);
		String end = sSearchDate + String.valueOf(lastDay) + "235959";

		List<ScheduleDto> dtoList = egovScheduleService.getScheduleListByDateRange("2", orgnztId, start, end);
		List<DeptSchdulManageVO> resultList = dtoList.stream()
				.map(ScheduleAdapter::toDeptVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageMonthList";
	}

	/**
	 * 부서일정 목록을 조회한다.
	 * 
	 * @return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList"
	 */
	@IncludedInfo(name = "부서일정관리", order = 320, gid = 40)
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageList.do")
	public String selectDeptSchdulManageList() {
		return "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList";
	}

	/**
	 * 부서일정 목록을 상세조회 조회한다.
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
			// JPA service로 대체
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			egovScheduleService.deleteSchedule(deptSchdulManageVO.getSchdulId(),
					user != null ? user.getUniqId() : null);
			sLocationUrl = "redirect:/cop/smt/sdm/EgovDeptSchdulManageList.do";
		} else {

			// 공통코드 중요도 조회
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM019");
			List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("schdulIpcrCode", listComCode);
			// 공통코드 일정구분 조회
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM030");
			listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("schdulSe", listComCode);
			// 공통코드 반복구분 조회
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM031");
			listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("reptitSeCode", listComCode);

			// JPA service로 대체: 상세 목록은 단일 건 조회로 대체
			ScheduleDto scheduleDto = egovScheduleService.getSchedule(deptSchdulManageVO.getSchdulId());
			List<DeptSchdulManageVO> resultList = new ArrayList<>();
			if (scheduleDto != null) {
				resultList.add(ScheduleAdapter.toDeptVO(scheduleDto));
			}
			model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * 부서일정 등록 화면을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageRegist.do")
	public String egovDeptSchdulManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageRegist";

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 공통코드 부서일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		// 공통코드 일정중요도조회
		voComCode.setCodeId("COM019");
		List<CmmnDetailCode> listSchdulIpcrCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulIpcrCode", listSchdulIpcrCode);

		// 공통코드 반복구분조회
		voComCode.setCodeId("COM031");
		List<CmmnDetailCode> listReptitSeCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("reptitSeCode", listReptitSeCode);

		return sLocationUrl;
	}

	/**
	 * 부서일정를 등록한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageRegistActor.do")
	public String deptSchdulManageRegistActor(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, BindingResult bindingResult,
			ModelMap model, MultipartHttpServletRequest multiRequest) throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 로그인 객체 선언
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// Validation
		// beanValidator.validate(deptSchdulManageVO, bindingResult);
		// if (bindingResult.hasErrors()) { return ... }

		// 첨부파일 처리
		List<FileVO> result = null;
		String atchFileId = "";

		final Map<String, MultipartFile> files = multiRequest.getFileMap();
		if (!files.isEmpty()) {
			result = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(result);
		}
		deptSchdulManageVO.setAtchFileId(atchFileId);
		deptSchdulManageVO.setFrstRegisterId(loginVO.getUniqId());
		deptSchdulManageVO.setLastUpdusrId(loginVO.getUniqId());

		// Force Dept ID from User (Owner of the schedule)
		deptSchdulManageVO.setSchdulDeptId(loginVO.getOrgnztId());
		// Force Schedule Type to '2' (Dept) if not set, though form should set it?
		// Usually ComCode COM030 handles schdulSe. User selects?
		// If this is Dept Schedule Manage, it should be Dept.
		// Assuming schdulSe is passed from form. If "2" (Dept), stick with it.

		ScheduleDto dto = ScheduleAdapter.toDto(deptSchdulManageVO);

		egovScheduleService.createSchedule(loginVO.getUniqId(), dto);

		return "redirect:/cop/smt/sdm/EgovDeptSchdulManageMainList.do";
	}

	/**
	 * 부서일정 수정 화면을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageModify.do")
	public String egovDeptSchdulManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageModify";

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 공통코드 부서일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		// 공통코드 일정중요도조회
		voComCode.setCodeId("COM019");
		List<CmmnDetailCode> listSchdulIpcrCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulIpcrCode", listSchdulIpcrCode);

		// 공통코드 반복구분조회
		voComCode.setCodeId("COM031");
		List<CmmnDetailCode> listReptitSeCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("reptitSeCode", listReptitSeCode);

		// Fetch Schedule
		ScheduleDto dto = egovScheduleService.getSchedule(deptSchdulManageVO.getSchdulId());
		DeptSchdulManageVO resultVO = ScheduleAdapter.toDeptVO(dto);

		model.addAttribute("schedule", resultVO);
		// Also legacy might expect 'resultList' list wrapper?
		List<DeptSchdulManageVO> resultList = new ArrayList<>();
		resultList.add(resultVO);
		model.addAttribute("resultList", resultList);

		return sLocationUrl;
	}

	/**
	 * 부서일정를 수정한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageModifyActor.do")
	public String deptSchdulManageModifyActor(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, BindingResult bindingResult,
			ModelMap model, MultipartHttpServletRequest multiRequest) throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 로그인 객체 선언
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// 첨부파일 처리
		String atchFileId = deptSchdulManageVO.getAtchFileId();

		final Map<String, MultipartFile> files = multiRequest.getFileMap();
		if (!files.isEmpty()) {
			if (EgovStringUtil.isEmpty(atchFileId)) {
				List<FileVO> result = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(result);
				deptSchdulManageVO.setAtchFileId(atchFileId);
			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int cnt = fileMngService.getMaxFileSN(fvo);
				List<FileVO> _result = fileUtil.parseFileInf(files, "DSCH_", cnt, atchFileId, "");
				fileMngService.updateFileInfs(_result);
			}
		}
		deptSchdulManageVO.setLastUpdusrId(loginVO.getUniqId());
		deptSchdulManageVO.setSchdulDeptId(loginVO.getOrgnztId()); // Ensure dept ID consistency

		ScheduleDto dto = ScheduleAdapter.toDto(deptSchdulManageVO);
		egovScheduleService.updateSchedule(deptSchdulManageVO.getSchdulId(), loginVO.getUniqId(), dto);

		return "redirect:/cop/smt/sdm/EgovDeptSchdulManageMainList.do";
	}

	/**
	 * 부서일정를 삭제한다.
	 */
	@RequestMapping(value = "/cop/smt/sdm/EgovDeptSchdulManageDelete.do")
	public String egovDeptSchdulManageDelete(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("deptSchdulManageVO") DeptSchdulManageVO deptSchdulManageVO, ModelMap model)
			throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 로그인 객체 선언 (Needed for auditing)
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = (loginVO != null) ? loginVO.getUniqId() : "";

		egovScheduleService.deleteSchedule(deptSchdulManageVO.getSchdulId(), uniqId);

		return "redirect:/cop/smt/sdm/EgovDeptSchdulManageMainList.do";
	}

	/**
	 * 시간을 LIST를 반환한다.
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
	 * 분을 LIST를 반환한다.
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
	 * 0을 붙여 반환
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
