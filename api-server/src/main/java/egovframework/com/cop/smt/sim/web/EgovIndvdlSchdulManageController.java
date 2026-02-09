package egovframework.com.cop.smt.sim.web;

import java.util.ArrayList;
import java.util.Calendar;
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
import egovframework.com.cmm.EgovComponentChecker;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 일정관리를 처리하는 Controller Class 구현
 * Refactored to use EgovScheduleService (JPA)
 */
@Controller
@RequiredArgsConstructor
public class EgovIndvdlSchdulManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovIndvdlSchdulManageController.class);

	private final EgovScheduleService egovScheduleService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

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
	 * 메인페이지/일정관리조회
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageMainList.do")
	public String egovIndvdlSchdulManageMainList(ModelMap model) throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList(loginVO.getUniqId(),
				PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "schdulBgnde")));
		List<IndvdlSchdulManageVO> resultList = pageResult.stream().map(ScheduleAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageMainList";
	}

	/**
	 * 일정(일별) 목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageDailyList.do")
	public String egovIndvdlSchdulManageDailyList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, IndvdlSchdulManageVO indvdlSchdulManageVO, ModelMap model)
			throws Exception {

		// 일정구분 검색 유지
		model.addAttribute("searchKeyword", commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition", commandMap.get("searchCondition"));

		// 공통코드 일정종류
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		// 캘런더 설정 로직
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

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("day", iNowDay);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = (loginVO != null) ? loginVO.getUniqId() : "";

		String start = strSearchDay + "000000";
		String end = strSearchDay + "235959";

		List<ScheduleDto> dtoList = egovScheduleService.getScheduleListByDateRange(userId, start, end);
		List<IndvdlSchdulManageVO> resultList = dtoList.stream().map(ScheduleAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageDailyList";
	}

	/**
	 * 일정(주간별) 목록을 조회한다.
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageWeekList.do")
	public String egovIndvdlSchdulManageWeekList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map commandMap, IndvdlSchdulManageVO indvdlSchdulManageVO, ModelMap model) throws Exception {

		// 일정구분 검색 유지
		model.addAttribute("searchKeyword", commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition", commandMap.get("searchCondition"));

		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		Calendar calNow = Calendar.getInstance();
		Calendar calBefore = Calendar.getInstance();
		Calendar calNext = Calendar.getInstance();

		String strYear = (String) commandMap.get("year");
		String strMonth = (String) commandMap.get("month");
		String strWeek = (String) commandMap.get("week");

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

		ArrayList listWeekGrop = new ArrayList();
		ArrayList listWeekDate = new ArrayList();

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
				listWeekDate = new ArrayList();
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

		List listWeek = (List) listWeekGrop.get(iNowWeek);
		String schdulBgnde = (String) listWeek.get(0);
		String schdulEndde = (String) listWeek.get(listWeek.size() - 1);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = (loginVO != null) ? loginVO.getUniqId() : "";

		String start = schdulBgnde + "000000";
		String end = schdulEndde + "235959";

		List<ScheduleDto> dtoList = egovScheduleService.getScheduleListByDateRange(userId, start, end);
		List<IndvdlSchdulManageVO> resultList = dtoList.stream().map(ScheduleAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageWeekList";
	}

	/**
	 * 일정(월별) 목록을 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageMonthList.do")
	public String egovIndvdlSchdulManageMonthList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<String, String> commandMap, IndvdlSchdulManageVO indvdlSchdulManageVO, ModelMap model)
			throws Exception {

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

		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM030");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("schdulSe", listComCode);

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = (loginVO != null) ? loginVO.getUniqId() : "";

		List<ScheduleDto> dtoList = egovScheduleService.getMonthlySchedule(userId, sSearchDate);
		List<IndvdlSchdulManageVO> resultList = dtoList.stream().map(ScheduleAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageMonthList";
	}

	/**
	 * 일정 목록을 조회한다.
	 */
	@IncludedInfo(name = "일정관리", order = 330, gid = 40)
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageList.do")
	public String egovIndvdlSchdulManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, IndvdlSchdulManageVO indvdlSchdulManageVO, ModelMap model)
			throws Exception {

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = (loginVO != null) ? loginVO.getUniqId() : "";

		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize(),
				Sort.by(Sort.Direction.DESC, "schdulBgnde"));
		Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList(userId, pageable);
		List<IndvdlSchdulManageVO> resultList = pageResult.stream().map(ScheduleAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);
		// Pagination logic not fully implemented in service for count?
		// Page object has total elements.
		// Legacy PaginationInfo needed.

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());
		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageList";
	}

	/**
	 * 일정 목록을 상세조회 조회한다.
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageDetail.do")
	public String egovIndvdlSchdulManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			IndvdlSchdulManageVO indvdlSchdulManageVO, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageDetail";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			String userId = (loginVO != null) ? loginVO.getUniqId() : "";
			egovScheduleService.deleteSchedule(indvdlSchdulManageVO.getSchdulId(), userId);
			sLocationUrl = "redirect:/cop/smt/sim/EgovIndvdlSchdulManageList.do";
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

			ScheduleDto dto = egovScheduleService.getSchedule(indvdlSchdulManageVO.getSchdulId());
			IndvdlSchdulManageVO vo = ScheduleAdapter.toVO(dto);

			// Legacy expects a List for resultList even for detail? No, detail usually
			// 'resultList' is 1 item or 'result' object.
			// Original code: selectIndvdlSchdulManageDetail returned List.
			List<IndvdlSchdulManageVO> sampleList = new ArrayList<>();
			sampleList.add(vo);
			model.addAttribute("resultList", sampleList);

			if (EgovComponentChecker.hasComponent("egovDiaryManageService")) {
				model.addAttribute("useDiaryManage", "true");
			}
		}

		return sLocationUrl;
	}

	/**
	 * 일정 수정 폼
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageModify.do")
	public String indvdlSchdulManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, IndvdlSchdulManageVO indvdlSchdulManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageModify";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

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

		model.addAttribute("schdulBgndeHH", getTimeHH());
		model.addAttribute("schdulBgndeMM", getTimeMM());
		model.addAttribute("schdulEnddeHH", getTimeHH());
		model.addAttribute("schdulEnddeMM", getTimeMM());

		ScheduleDto dto = egovScheduleService.getSchedule(indvdlSchdulManageVO.getSchdulId());
		IndvdlSchdulManageVO resultIndvdlSchdulManageVOReuslt = ScheduleAdapter.toVO(dto);

		String sSchdulBgnde = resultIndvdlSchdulManageVOReuslt.getSchdulBgnde();
		String sSchdulEndde = resultIndvdlSchdulManageVOReuslt.getSchdulEndde();

		resultIndvdlSchdulManageVOReuslt.setSchdulBgndeYYYMMDD(
				sSchdulBgnde.substring(0, 4) + "-" + sSchdulBgnde.substring(4, 6) + "-" + sSchdulBgnde.substring(6, 8));
		resultIndvdlSchdulManageVOReuslt.setSchdulBgndeHH(sSchdulBgnde.substring(8, 10));
		resultIndvdlSchdulManageVOReuslt.setSchdulBgndeMM(sSchdulBgnde.substring(10, 12));

		resultIndvdlSchdulManageVOReuslt.setSchdulEnddeYYYMMDD(
				sSchdulEndde.substring(0, 4) + "-" + sSchdulEndde.substring(4, 6) + "-" + sSchdulEndde.substring(6, 8));
		resultIndvdlSchdulManageVOReuslt.setSchdulEnddeHH(sSchdulEndde.substring(8, 10));
		resultIndvdlSchdulManageVOReuslt.setSchdulEnddeMM(sSchdulEndde.substring(10, 12));

		model.addAttribute("indvdlSchdulManageVO", resultIndvdlSchdulManageVOReuslt);

		return sLocationUrl;
	}

	/**
	 * 일정를 수정 처리 한다.
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageModifyActor.do")
	public String indvdlSchdulManageModifyActor(final MultipartHttpServletRequest multiRequest, ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("indvdlSchdulManageVO") IndvdlSchdulManageVO indvdlSchdulManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageModify";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {
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

				model.addAttribute("schdulBgndeHH", getTimeHH());
				model.addAttribute("schdulBgndeMM", getTimeMM());
				model.addAttribute("schdulEnddeHH", getTimeHH());
				model.addAttribute("schdulEnddeMM", getTimeMM());
				return sLocationUrl;
			}

			String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

			String atchFileId = indvdlSchdulManageVO.getAtchFileId();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				String atchFileAt = commandMap.get("atchFileAt") == null ? "" : (String) commandMap.get("atchFileAt");
				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);
					indvdlSchdulManageVO.setAtchFileId(atchFileId);
				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			ScheduleDto dto = ScheduleAdapter.toDto(indvdlSchdulManageVO);
			egovScheduleService.updateSchedule(indvdlSchdulManageVO.getSchdulId(), userId, dto);
			sLocationUrl = "redirect:/cop/smt/sim/EgovIndvdlSchdulManageList.do";
		}

		return sLocationUrl;
	}

	/**
	 * 일정를 등록 폼
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageRegist.do")
	public String indvdlSchdulManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("indvdlSchdulManageVO") IndvdlSchdulManageVO indvdlSchdulManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageRegist";

		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

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

		model.addAttribute("schdulBgndeHH", getTimeHH());
		model.addAttribute("schdulBgndeMM", getTimeMM());
		model.addAttribute("schdulEnddeHH", getTimeHH());
		model.addAttribute("schdulEnddeMM", getTimeMM());

		return sLocationUrl;
	}

	/**
	 * 일정를 등록 처리 한다.
	 */
	@RequestMapping(value = "/cop/smt/sim/EgovIndvdlSchdulManageRegistActor.do")
	public String indvdlSchdulManageRegistActor(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, @RequestParam Map<?, ?> commandMap,
			@Valid @ModelAttribute("indvdlSchdulManageVO") IndvdlSchdulManageVO indvdlSchdulManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageRegist";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}

			// 첨부파일 관련 첨부파일ID 생성
			List<FileVO> fvoList = null;
			String atchFileId = "";

			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList);
			}

			indvdlSchdulManageVO.setAtchFileId(atchFileId);
			String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
			indvdlSchdulManageVO.setFrstRegisterId(userId);
			indvdlSchdulManageVO.setSchdulChargerId(userId);

			ScheduleDto dto = ScheduleAdapter.toDto(indvdlSchdulManageVO);
			egovScheduleService.createSchedule(userId, dto);

			sLocationUrl = "redirect:/cop/smt/sim/EgovIndvdlSchdulManageList.do";
		}

		return sLocationUrl;
	}

	private List<ComDefaultCodeVO> getTimeHH() {
		ArrayList<ComDefaultCodeVO> listHH = new ArrayList<>();
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

	private List<ComDefaultCodeVO> getTimeMM() {
		ArrayList<ComDefaultCodeVO> listMM = new ArrayList<>();
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
