package egovframework.com.uss.ion.mtg.web;

import java.util.Calendar;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
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
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.company.project.service.meeting.EgovMeetingService;
import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManage;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManageVO;
import egovframework.com.uss.ion.mtg.service.MtgPlaceResve;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 개요
 * - 회의실관리에 대한 controller 클래스를 정의한다.
 *
 * 상세내용
 * - 회의실관리에 대한 등록, 수정, 삭제, 조회 기능을 제공한다.
 * - 회의실관리의 조회기능은 목록조회, 상세조회로 구분된다.
 * </pre>
 *
 * @author 이용
 * @since 2010.06.15
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2010.06.15  이용           최초 생성
 *   2011.08.26  정진오          IncludedInfo annotation 추가
 *   2025.08.08  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-LocalVariableNamingConventions(final이 아닌 변수는 밑줄을 포함할 수 없음)
 *
 *      </pre>
 */
@Controller
public class EgovMtgPlaceManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	// JPA Service Injection
	@Resource(name = "meetingService")
	private EgovMeetingService egovMtgPlaceManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	// 첨부파일 관련
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * 회의실관리 목록화면 이동
	 *
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/mtg/selectMtgPlaceManageListView.do")
	public String selectMtgPlaceManageListView() throws Exception {

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList";
	}

	/**
	 * 회의실관리정보를 관리하기 위해 등록된 회의실관리 목록을 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@IncludedInfo(name = "회의실관리", order = 870, gid = 50)
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceManageList.do")
	public String selectMtgPlaceManageList(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage, BindingResult bindingResult,
			ModelMap model) throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(mtgPlaceManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(mtgPlaceManageVO.getPageUnit());
		paginationInfo.setPageSize(mtgPlaceManageVO.getPageSize());

		mtgPlaceManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		mtgPlaceManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		mtgPlaceManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service Call
		Pageable pageable = PageRequest.of(mtgPlaceManageVO.getPageIndex() - 1, mtgPlaceManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<MeetingPlaceDto> page = egovMtgPlaceManageService.getMeetingPlaceList(mtgPlaceManageVO.getSearchKeyword(),
				pageable);

		// Convert DTO to VO using helper
		List<MtgPlaceManageVO> voList = page.getContent().stream()
				.map(this::convertToMtgVO)
				.collect(Collectors.toList());

		mtgPlaceManageVO.setMtgPlaceManageList(voList);

		int totCnt = (int) page.getTotalElements();
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("mtgPlaceManageList", mtgPlaceManageVO.getMtgPlaceManageList());
		model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList";
	}

	/**
	 * 등록된 회의실관리의 상세정보를 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceManage.do")
	public String selectMtgPlaceManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // 상세정보 구분
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM070");
		List<CmmnDetailCode> lcSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		// JPA Service Call
		MeetingPlaceDto dto = egovMtgPlaceManageService.getMeetingPlace(mtgPlaceManageVO.getMtgPlaceId());

		model.addAttribute("lcSeCode", lcSeCodeList);
		model.addAttribute("mtgPlaceManage", convertToMtgVO(dto));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("update")) {
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceUpdt";
		} else {
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceDetail";
		}
	}

	/**
	 * 회의실관리 등록 화면으로 이동한다.
	 *
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/insertViewMtgPlace.do")
	public String insertViewMtgPlaceManage(@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, ModelMap model) throws Exception {

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM070");
		List<CmmnDetailCode> lcSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("lcSeCode", lcSeCodeList);

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceRegist";
	}

	/**
	 * 회의실관리정보를 신규로 등록한다.
	 *
	 * @param mtgPlaceManage - 회의실관리 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/insertMtgPlace.do")
	public String insertMtgPlaceManage(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceRegist";
		} else {
			// 첨부파일 관련 첨부파일ID 생성
			List<FileVO> fvoList = null;
			String atchFileId = "";

			final List<MultipartFile> files = multiRequest.getFiles("file_1");
			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "MTG_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // 파일이 생성되고나면 생성된 첨부파일 ID를 리턴한다.
			}
			// 리턴받은 첨부파일ID를 셋팅한다..
			mtgPlaceManage.setAtchFileId(atchFileId); // 첨부파일 ID

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();

			// JPA Service Call
			MeetingPlaceDto dto = MeetingPlaceDto.builder()
					.mtgPlaceNm(mtgPlaceManage.getMtgPlaceNm())
					.opnBeginTm(mtgPlaceManage.getOpnBeginTm())
					.opnEndTm(mtgPlaceManage.getOpnEndTm())
					.aceptncPosblNmpr(mtgPlaceManage.getAceptncPosblNmpr())
					.lcSe(mtgPlaceManage.getLcSe())
					.lcDetail(mtgPlaceManage.getLcDetail())
					.atchFileId(mtgPlaceManage.getAtchFileId())
					.frstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()))
					.build();

			egovMtgPlaceManageService.createMeetingPlace(dto.getFrstRegisterId(), dto);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "redirect:/uss/ion/mtg/selectMtgPlaceManageList.do";
		}
	}

	/**
	 * 기 등록된 회의실관리정보를 수정한다.
	 *
	 * @param mtgPlaceManage - 회의실관리 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/updtMtgPlace.do")
	public String updateMtgPlaceManage(final MultipartHttpServletRequest multiRequest,
			@RequestParam("atchFileAt") String atchFileAt,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManage);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceUpdt";
		} else {

			// 첨부파일 관련 ID 생성 start....
			String atchFileId = mtgPlaceManage.getAtchFileId();

			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {

				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "MTG_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 첨부파일 ID 셋팅
					mtgPlaceManage.setAtchFileId(atchFileId); // 첨부파일 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "MTG_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}
			// 첨부파일 관련 ID 생성 end...

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();

			// JPA Service Call
			MeetingPlaceDto dto = MeetingPlaceDto.builder()
					.mtgPlaceNm(mtgPlaceManage.getMtgPlaceNm())
					.opnBeginTm(mtgPlaceManage.getOpnBeginTm())
					.opnEndTm(mtgPlaceManage.getOpnEndTm())
					.aceptncPosblNmpr(mtgPlaceManage.getAceptncPosblNmpr())
					.lcSe(mtgPlaceManage.getLcSe())
					.lcDetail(mtgPlaceManage.getLcDetail())
					.atchFileId(mtgPlaceManage.getAtchFileId())
					.frstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()))
					.build();

			egovMtgPlaceManageService.updateMeetingPlace(mtgPlaceManage.getMtgPlaceId(), dto.getFrstRegisterId(), dto);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "redirect:/uss/ion/mtg/selectMtgPlaceManageList.do";
		}
	}

	/**
	 * 기 등록된 회의실관리정보를 삭제한다.
	 *
	 * @param mtgPlaceManage - 회의실관리 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/deleteMtgPlaceManage.do")
	public String deleteMtgPlaceManage(@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			SessionStatus status, ModelMap model) throws Exception {
		// 첨부파일 삭제를 위한 ID 생성 start....
		String atchFileId = mtgPlaceManage.getAtchFileId();

		egovMtgPlaceManageService.deleteMeetingPlace(mtgPlaceManage.getMtgPlaceId());

		// 첨부파일을 삭제하기 위한 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 첨부파일 삭제 End.............

		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/mtg/selectMtgPlaceManageList.do";
	}

	/**
	 * 등록된 회의실관리의 이미지 상세정보를 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceImage.do")
	public String selectMtgPlaceImage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@RequestParam("sTmMtgPlaceId") String sTmMtgPlaceId, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {
		mtgPlaceManageVO.setMtgPlaceId(sTmMtgPlaceId);

		MeetingPlaceDto resultVO = egovMtgPlaceManageService.getMeetingPlace(mtgPlaceManageVO.getMtgPlaceId());

		FileVO fileVO = new FileVO();
		fileVO.setAtchFileId(resultVO.getAtchFileId());
		List<FileVO> result = fileMngService.selectImageFileList(fileVO);

		model.addAttribute("fileList", result);
		model.addAttribute("mtgPlaceManage", convertToMtgVO(resultVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceImageDetail";
	}

	/**** 회의실 예약 ****/

	/**
	 * 회의실예약 정보를 관리하기 위해 등록된 회의실예약 목록을 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@IncludedInfo(name = "회의실예약관리", order = 871, gid = 50)
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManageList.do")
	public String selectMtgPlaceResveManageList(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			ModelMap model) throws Exception {
		/*
		 * ***************************************************************** // 캘런더 설정
		 * 로직
		 */
		Calendar calNow = Calendar.getInstance();
		/*
		 * String strYear = (String)commandMap.get("year"); String strMonth =
		 * (String)commandMap.get("month"); String strDay =(
		 * String)commandMap.get("day");
		 */
		String strSearchDay = "";

		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDay = calNow.get(Calendar.DATE);

		if (mtgPlaceManageVO.getResveDe() == null) {
			strSearchDay = Integer.toString(iNowYear);
			strSearchDay += dateTypeIntForString(iNowMonth + 1);
			strSearchDay += dateTypeIntForString(iNowDay);
			mtgPlaceManageVO.setResveDe(strSearchDay);
			mtgPlaceManageVO.setResveDeView(EgovDateUtil.formatDate(strSearchDay, "-"));
		} else {
			mtgPlaceManageVO.setResveDeView(EgovDateUtil.formatDate(mtgPlaceManageVO.getResveDe(), "-"));
		}

		mtgPlaceManageVO.setResveDe(EgovDateUtil.formatDate(mtgPlaceManageVO.getResveDe(), "-")); // formatDate

		// JPA Service Call
		// Search by keyword which seems to be "meeting subject" based on legacy mapper.
		Pageable pageable = PageRequest.of(mtgPlaceManageVO.getPageIndex() - 1, mtgPlaceManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "resveDe", "resveBeginTm"));
		Page<MeetingReservationDto> page = egovMtgPlaceManageService
				.getMeetingReservationList(mtgPlaceManageVO.getSearchKeyword(), pageable);

		List<MtgPlaceManageVO> voList = page.getContent().stream()
				.map(this::convertToResveVO)
				.collect(Collectors.toList());

		mtgPlaceManageVO.setMtgPlaceManageList(voList);

		model.addAttribute("mtgPlaceManageList", mtgPlaceManageVO.getMtgPlaceManageList());
		model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
		// model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveManageList";
	}

	/**
	 * 회의실예약 신청 화면을 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManage.do")
	public String selectMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sTempResveDe = mtgPlaceManageVO.getResveDe();
		String sTempResveBeginTm = mtgPlaceManageVO.getResveBeginTm();
		String sTempResveEndTm = mtgPlaceManageVO.getResveEndTm();

		// Retrieve Meeting Place Info for Reservation
		MeetingPlaceDto placeDto = egovMtgPlaceManageService.getMeetingPlace(mtgPlaceManageVO.getMtgPlaceId());
		MtgPlaceManageVO resultVO = convertToMtgVO(placeDto);

		// Pre-fill fields
		resultVO.setResveDe(sTempResveDe);
		resultVO.setResveBeginTm(sTempResveBeginTm);
		resultVO.setResveEndTm(sTempResveEndTm);
		resultVO.setResveDe(EgovDateUtil.formatDate(resultVO.getResveDe(), "-"));

		// 로그인 객체 선언
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		resultVO.setMtgPlaceTemp4(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));
		resultVO.setMtgPlaceTemp5(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getOrgnztNm()));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		model.addAttribute("mtgPlaceManageVO", resultVO);
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveRegist";
	}

	/**
	 * 등록된 회의실예약 상세정보를 조회한다.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManageDetail.do")
	public String selectMtgPlaceResveManageDetail(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // 상세정보 구분

		MeetingReservationDto dto = egovMtgPlaceManageService.getMeetingReservation(mtgPlaceManageVO.getResveId());
		MtgPlaceManageVO resultVO = convertToResveVO(dto);

		// Populate Location/Place Name etc. via MeetingPlace
		MeetingPlaceDto placeDto = egovMtgPlaceManageService.getMeetingPlace(dto.getMtgPlaceId());
		resultVO.setMtgPlaceNm(placeDto.getMtgPlaceNm());
		resultVO.setLcDetail(placeDto.getLcDetail());

		resultVO.setResveDe(EgovDateUtil.formatDate(resultVO.getResveDe(), "-"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("detail")) {
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			resultVO.setUsidTemp(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			String resveBeginTm = resultVO.getResveBeginTm();
			String resveEndTm = resultVO.getResveEndTm();
			if (resveBeginTm.length() == 3) {
				resveBeginTm = "0" + resveBeginTm.substring(0, 1) + ":" + resveBeginTm.substring(1, 3);
			} else if (resveBeginTm.length() == 4) {
				resveBeginTm = resveBeginTm.substring(0, 2) + ":" + resveBeginTm.substring(2, 4);
			}
			if (resveEndTm.length() == 3) {
				resveEndTm = "0" + resveEndTm.substring(0, 1) + ":" + resveEndTm.substring(1, 3);
			} else if (resveEndTm.length() == 4) {
				resveEndTm = resveEndTm.substring(0, 2) + ":" + resveEndTm.substring(2, 4);
			}

			resultVO.setResveBeginTm(resveBeginTm);
			resultVO.setResveEndTm(resveEndTm);
			model.addAttribute("mtgPlaceManageVO", resultVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveDetail";
		} else {
			model.addAttribute("mtgPlaceManageVO", resultVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveUpdt";
		}
	}

	/**
	 * 회의실예약 정보를 신규로 등록한다.
	 *
	 * @param mtgPlaceResve - 회의실예약 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/insertMtgPlaceResve.do")
	public String insertMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
			return "forward:/uss/ion/mtg/selectMtgPlaceResveManage.do";
		} else {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			mtgPlaceResve.setResveManId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			mtgPlaceResve.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			MeetingReservationDto dto = MeetingReservationDto.builder()
					.mtgPlaceId(mtgPlaceResve.getMtgPlaceId())
					.mtgSj(mtgPlaceResve.getMtgSj())
					.resveManId(mtgPlaceResve.getResveManId())
					.resveDe(mtgPlaceResve.getResveDe())
					.resveBeginTm(mtgPlaceResve.getResveBeginTm())
					.resveEndTm(mtgPlaceResve.getResveEndTm())
					.atndncNmpr(mtgPlaceResve.getAtndncNmpr())
					.mtgCn(mtgPlaceResve.getMtgCn())
					.frstRegisterId(mtgPlaceResve.getFrstRegisterId())
					.build();

			egovMtgPlaceManageService.reserveMeetingPlace(user.getUniqId(), dto);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
		}
	}

	/**
	 * 기 등록된 회의실예약 정보를 수정한다.
	 *
	 * @param mtgPlaceResve - 회의실예약 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/updtMtgPlaceResve.do")
	public String updtMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceResve);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();

			MeetingReservationDto dto = MeetingReservationDto.builder()
					.mtgPlaceId(mtgPlaceResve.getMtgPlaceId())
					.mtgSj(mtgPlaceResve.getMtgSj())
					.resveManId(mtgPlaceResve.getResveManId())
					.resveDe(mtgPlaceResve.getResveDe())
					.resveBeginTm(mtgPlaceResve.getResveBeginTm())
					.resveEndTm(mtgPlaceResve.getResveEndTm())
					.atndncNmpr(mtgPlaceResve.getAtndncNmpr())
					.mtgCn(mtgPlaceResve.getMtgCn())
					.frstRegisterId(user.getUniqId())
					.build();

			egovMtgPlaceManageService.updateMeetingReservation(mtgPlaceResve.getResveId(), user.getUniqId(), dto);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
		}
	}

	/**
	 * 기 등록된 회의실예약 정보를 삭제한다.
	 *
	 * @param mtgPlaceResve - 회의실예약 model
	 * @return String - 리턴 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/deleteMtgPlaceResve.do")
	public String deleteMtgPlaceResveManage(@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve,
			SessionStatus status, ModelMap model) throws Exception {

		egovMtgPlaceManageService.cancelMeetingReservation(mtgPlaceResve.getResveId());
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
	}

	/**
	 * 회의실 중복여부 체크.
	 *
	 * @param mtgPlaceManageVO - 회의실관리 VO
	 * @return int - 중복건수
	 */
	@RequestMapping(value = "/uss/ion/mtg/mtgPlaceResveDplactCeck.do")
	public String mtgPlaceResveDplactCeck(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@RequestParam("sTmResveDe") String sTempResveDe, @RequestParam("sTmResveBeginTm") String sTempResveBeginTm,
			@RequestParam("sTmResveEndTm") String sTempResveEndTm,
			@RequestParam("sTmMtgPlaceId") String sTempMtgPlaceId, @RequestParam("sTmResveId") String sTempResveId,
			ModelMap model) throws Exception {
		mtgPlaceManageVO.setResveDe(sTempResveDe);
		mtgPlaceManageVO.setMtgPlaceId(sTempMtgPlaceId);
		mtgPlaceManageVO.setResveBeginTm(sTempResveBeginTm);
		mtgPlaceManageVO.setResveEndTm(sTempResveEndTm);
		mtgPlaceManageVO.setResveId(sTempResveId);

		int dplactCeckCnt = egovMtgPlaceManageService.checkReservationConflict(
				mtgPlaceManageVO.getMtgPlaceId(),
				mtgPlaceManageVO.getResveDe(),
				mtgPlaceManageVO.getResveBeginTm(),
				mtgPlaceManageVO.getResveEndTm(),
				mtgPlaceManageVO.getResveId());

		model.addAttribute("dplactCeck", dplactCeckCnt);
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveDplactCeck";
	}

	/**
	 * 0을 붙여 반환
	 *
	 * @return String
	 * @throws
	 */
	private String dateTypeIntForString(int iInput) {
		String sOutput = "";
		if (Integer.toString(iInput).length() == 1) {
			sOutput = "0" + Integer.toString(iInput);
		} else {
			sOutput = Integer.toString(iInput);
		}
		return sOutput;
	}

	private MtgPlaceManageVO convertToMtgVO(MeetingPlaceDto dto) {
		if (dto == null)
			return null;
		MtgPlaceManageVO vo = new MtgPlaceManageVO();
		vo.setMtgPlaceId(dto.getMtgPlaceId());
		vo.setMtgPlaceNm(dto.getMtgPlaceNm());
		vo.setOpnBeginTm(dto.getOpnBeginTm());
		vo.setOpnEndTm(dto.getOpnEndTm());
		vo.setAceptncPosblNmpr(dto.getAceptncPosblNmpr());
		vo.setLcSe(dto.getLcSe());
		vo.setLcDetail(dto.getLcDetail());
		vo.setAtchFileId(dto.getAtchFileId());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		return vo;
	}

	private MtgPlaceManageVO convertToResveVO(MeetingReservationDto dto) {
		if (dto == null)
			return null;
		MtgPlaceManageVO vo = new MtgPlaceManageVO();
		vo.setResveId(dto.getResveId());
		vo.setMtgPlaceId(dto.getMtgPlaceId());
		vo.setMtgSj(dto.getMtgSj());
		vo.setResveManId(dto.getResveManId());
		vo.setResveDe(dto.getResveDe());
		vo.setResveBeginTm(dto.getResveBeginTm());
		vo.setResveEndTm(dto.getResveEndTm());
		vo.setAtndncNmpr(dto.getAtndncNmpr());
		vo.setMtgCn(dto.getMtgCn());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		return vo;
	}
}
