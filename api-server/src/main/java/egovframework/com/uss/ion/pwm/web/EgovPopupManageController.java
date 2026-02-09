package egovframework.com.uss.ion.pwm.web;

import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import org.springframework.web.servlet.ModelAndView;

import com.company.project.service.popup.EgovPopupService;
import com.company.project.service.popup.dto.PopupDto;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.pwm.service.PopupManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;

/**
 * <pre>
 * 개요 - 팝업창에 대한 Controller를 정의한다.
 *
 * 상세내용 - 팝업창에 대한 등록, 수정, 삭제, 조회, 반영확인 기능을 제공한다. - 팝업창의 조회기능은 목록조회, 상세조회로, 사용자
 * 화면 보기로 구분된다.
 * </pre>
 *
 * @author 이창원
 * @since 2009.08.05
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.08.05  이창원          최초 생성
 *   2011.08.26  정진오          IncludedInfo annotation 추가
 *   2019.05.17  신용호          취약점 조치 및 보완
 *   2025.08.11  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-CloseResource(부적절한 자원 해제)
 *   2025.08.11  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-AvoidReassigningParameters(넘겨받는 메소드 parameter 값을 직접 변경하는 코드 탐지)
 *
 *      </pre>
 */
@Controller
public class EgovPopupManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPopupManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// JPA Service Injection
	@Resource(name = "popupService")
	private EgovPopupService egovPopupManageService;

	/**
	 * 팝업창관리 목록을 조회한다.
	 *
	 * @param popupManageVO
	 * @param model
	 * @return "egovframework/com/uss/ion/pwm/listPopupManage"
	 * @throws Exception
	 */
	@IncludedInfo(name = "팝업창관리", order = 720, gid = 50)
	@RequestMapping(value = "/uss/ion/pwm/listPopup.do")
	public String egovPopupManageList(@RequestParam Map<?, ?> commandMap, PopupManageVO popupManageVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample */
		popupManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
		popupManageVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(popupManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(popupManageVO.getPageUnit());
		paginationInfo.setPageSize(popupManageVO.getPageSize());

		popupManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		popupManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		popupManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service Call
		Pageable pageable = PageRequest.of(popupManageVO.getPageIndex() - 1, popupManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<PopupDto> page = egovPopupManageService.getPopupList(popupManageVO.getSearchKeyword(), pageable);

		List<EgovMap> resultList = page.getContent().stream().map(dto -> {
			EgovMap map = new EgovMap();
			map.put("popupId", dto.getPopupId());
			map.put("popupTitleNm", dto.getPopupTitleNm());
			map.put("fileUrl", dto.getFileUrl());
			map.put("ntceBgnde", dto.getNtceBgnde());
			map.put("ntceEndde", dto.getNtceEndde());
			map.put("ntceAt", dto.getNtceAt());
			map.put("stopVewAt", dto.getStopVewAt());
			map.put("frstRegistPnttm", dto.getFrstRegisterPnttm()); // 포맷팅 필요시 추가 처리
			return map;
		}).collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = (int) page.getTotalElements();
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/pwm/EgovPopupList";
	}

	/**
	 * 통합링크관리 목록을 상세조회 조회한다.
	 *
	 * @param popupManageVO
	 * @param commandMap
	 * @param model
	 * @return "/uss/ion/pwm/detailPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/detailPopup.do")
	public String egovPopupManageDetail(PopupManageVO popupManageVO, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovPopupManageService.deletePopup(popupManageVO.getPopupId());
			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";
		} else {
			// 상세정보 불러오기
			PopupDto dto = egovPopupManageService.getPopup(popupManageVO.getPopupId());
			model.addAttribute("popupManageVO", convertToVO(dto));
		}

		return sLocationUrl;
	}

	/**
	 * 통합링크관리를 수정한다.
	 *
	 * @param searchVO
	 * @param popupManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/uss/ion/pwm/updtPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/updtPopup.do")
	public String egovPopupManageUpdt(@RequestParam Map<?, ?> commandMap, PopupManageVO popupManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 로그인 객체 선언
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupUpdt";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		// 팝업창시작일자(시)
		model.addAttribute("ntceBgndeHH", getTimeHH());
		// 팝업창시작일자(분)
		model.addAttribute("ntceBgndeMM", getTimeMM());
		// 팝업창종료일자(시)
		model.addAttribute("ntceEnddeHH", getTimeHH());
		// 팝업창정료일자(분)
		model.addAttribute("ntceEnddeMM", getTimeMM());

		if (sCmd.equals("save")) {
			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";

			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}
			// 아이디 설정
			popupManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			popupManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// 저장 (JPA Service Call)
			PopupDto dto = PopupDto.builder()
					.popupTitleNm(popupManageVO.getPopupTitleNm())
					.fileUrl(popupManageVO.getFileUrl())
					.popupWlc(popupManageVO.getPopupWlc())
					.popupHlc(popupManageVO.getPopupHlc())
					.popupHSize(popupManageVO.getPopupHSize())
					.popupWSize(popupManageVO.getPopupWSize())
					.ntceBgnde(popupManageVO.getNtceBgnde())
					.ntceEndde(popupManageVO.getNtceEndde())
					.stopVewAt(popupManageVO.getStopVewAt())
					.ntceAt(popupManageVO.getNtceAt())
					.build();

			egovPopupManageService.updatePopup(popupManageVO.getPopupId(), popupManageVO.getLastUpdusrId(), dto);
		} else {

			PopupDto dto = egovPopupManageService.getPopup(popupManageVO.getPopupId());
			PopupManageVO popupManageVOs = convertToVO(dto);

			String sNtceBgnde = popupManageVOs.getNtceBgnde();
			String sNtceEndde = popupManageVOs.getNtceEndde();

			popupManageVOs.setNtceBgndeHH(sNtceBgnde.substring(8, 10));
			popupManageVOs.setNtceBgndeMM(sNtceBgnde.substring(10, 12));

			popupManageVOs.setNtceEnddeHH(sNtceEndde.substring(8, 10));
			popupManageVOs.setNtceEnddeMM(sNtceEndde.substring(10, 12));

			model.addAttribute("popupManageVO", popupManageVOs);
		}

		return sLocationUrl;
	}

	/**
	 * 통합링크관리를 등록한다.
	 *
	 * @param searchVO
	 * @param popupManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/uss/ion/pwm/registPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/registPopup.do")
	public String egovPopupManageRegist(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("popupManageVO") PopupManageVO popupManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security 사용자권한 처리
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 로그인 객체 선언
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {

			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}
			// 아이디 설정
			popupManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			popupManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// 저장 (JPA Service Call)
			PopupDto dto = PopupDto.builder()
					.popupTitleNm(popupManageVO.getPopupTitleNm())
					.fileUrl(popupManageVO.getFileUrl())
					.popupWlc(popupManageVO.getPopupWlc())
					.popupHlc(popupManageVO.getPopupHlc())
					.popupHSize(popupManageVO.getPopupHSize())
					.popupWSize(popupManageVO.getPopupWSize())
					.ntceBgnde(popupManageVO.getNtceBgnde())
					.ntceEndde(popupManageVO.getNtceEndde())
					.stopVewAt(popupManageVO.getStopVewAt())
					.ntceAt(popupManageVO.getNtceAt())
					.build();

			egovPopupManageService.createPopup(popupManageVO.getFrstRegisterId(), dto);

			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";
		}

		// 팝업창시작일자(시)
		model.addAttribute("ntceBgndeHH", getTimeHH());
		// 팝업창시작일자(분)
		model.addAttribute("ntceBgndeMM", getTimeMM());
		// 팝업창종료일자(시)
		model.addAttribute("ntceEnddeHH", getTimeHH());
		// 팝업창정료일자(분)
		model.addAttribute("ntceEnddeMM", getTimeMM());

		return sLocationUrl;
	}

	/**
	 * 팝업창정보를 조회한다.
	 *
	 * @param commandMap
	 * @param popupManageVO
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/ajaxPopupManageInfo.do")
	public void egovPopupManageInfoAjax(@RequestParam Map<?, ?> commandMap, HttpServletResponse response,
			PopupManageVO popupManageVO) throws Exception {

		response.setHeader("Content-Type", "text/html;charset=utf-8");

		PrintWriter out = null; // NOPMD - CloseResource 규칙 무시
		try {
			out = new PrintWriter(new OutputStreamWriter(response.getOutputStream(), "UTF-8"));

			LOGGER.debug("commandMap : {}", commandMap);
			LOGGER.debug("popupManageVO : {}", popupManageVO);

			PopupDto dto = egovPopupManageService.getPopup(popupManageVO.getPopupId());
			PopupManageVO popupManageVOs = convertToVO(dto);

			String sPrint = popupManageVOs.getFileUrl() + "||" + popupManageVOs.getPopupWSize() + "||"
					+ popupManageVOs.getPopupHSize() + "||" + popupManageVOs.getPopupHlc() + "||"
					+ popupManageVOs.getPopupWlc() + "||" + popupManageVOs.getStopVewAt();

			out.print(EgovWebUtil.clearXSSMinimum(sPrint));
		} finally {
			if (out != null) {
				out.flush();
			}
		}
	}

	/**
	 * 팝업창을 오픈 한다.
	 *
	 * @param commandMap
	 * @param popupManageVO
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/openPopupManage.do")
	public String egovPopupManagePopupOpen(@RequestParam("fileUrl") String fileUrl,
			@RequestParam("stopVewAt") String stopVewAt, @RequestParam("popupId") String popupId, ModelMap model)
			throws Exception {

		model.addAttribute("stopVewAt", stopVewAt);
		model.addAttribute("popupId", popupId);

		String fileUrl2 = EgovWebUtil.filePathBlackList(fileUrl);

		List<String> popupWhiteList = egovPopupManageService.getPopupWhiteList();
		LOGGER.debug("Open Popup > WhiteList Count = {}", popupWhiteList.size());
		if (fileUrl2 == null) {
			fileUrl2 = "";
		}
		for (String whiteUrl : popupWhiteList) {
			// EgovMap map = (EgovMap) obj;
			LOGGER.debug("Open Popup > whiteList fileUrl = " + whiteUrl);
			if (fileUrl2.equals(whiteUrl)) {
				return fileUrl2;
			}
		}
		// System.out.println("===>>> "+popupWhiteList.size());
		LOGGER.debug("Open Popup > WhiteList mismatch! Please check Admin page!");
		return "egovframework/com/cmm/egovError";
	}

	/**
	 * 팝업창관리 메인 테스트 목록을 조회한다.
	 *
	 * @param popupManageVO
	 * @param model
	 * @return "egovframework/com/uss/ion/pwm/listMainPopup"
	 * @throws Exception 팝업창리스트를 가져온다.
	 */
	@RequestMapping(value = "/uss/ion/pwm/listMainPopup.do")

	public ModelAndView egovPopupManageMainList(PopupManageVO popupManageVO, ModelMap model) throws Exception {
		List<PopupDto> resultList = egovPopupManageService.getActivePopups();

		List<EgovMap> egovMapList = resultList.stream().map(dto -> {
			EgovMap map = new EgovMap();
			map.put("popupId", dto.getPopupId());
			map.put("popupTitleNm", dto.getPopupTitleNm());
			map.put("fileUrl", dto.getFileUrl());
			map.put("popupWlc", dto.getPopupWlc());
			map.put("popupHlc", dto.getPopupHlc());
			map.put("popupWSize", dto.getPopupWSize());
			map.put("popupHSize", dto.getPopupHSize());
			map.put("stopVewAt", dto.getStopVewAt());
			return map;
		}).collect(Collectors.toList());

		ModelAndView mav = new ModelAndView("jsonView");
		mav.addObject("resultList", egovMapList);
		return mav;
	}

	/**
	 * 시간을 LIST를 반환한다.
	 *
	 * @return List
	 * @throws
	 */
	@SuppressWarnings("unused")
	private List<ComDefaultCodeVO> getTimeHH() {
		ArrayList<ComDefaultCodeVO> listHH = new ArrayList<ComDefaultCodeVO>();
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
	@SuppressWarnings("unused")
	private List<ComDefaultCodeVO> getTimeMM() {
		ArrayList<ComDefaultCodeVO> listMM = new ArrayList<ComDefaultCodeVO>();
		HashMap<?, ?> hmHHMM;
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

	private PopupManageVO convertToVO(PopupDto dto) {
		if (dto == null)
			return null;
		PopupManageVO vo = new PopupManageVO();
		vo.setPopupId(dto.getPopupId());
		vo.setPopupTitleNm(dto.getPopupTitleNm());
		vo.setFileUrl(dto.getFileUrl());
		vo.setPopupWlc(dto.getPopupWlc());
		vo.setPopupHlc(dto.getPopupHlc());
		vo.setPopupHSize(dto.getPopupHSize());
		vo.setPopupWSize(dto.getPopupWSize());
		vo.setNtceBgnde(dto.getNtceBgnde());
		vo.setNtceEndde(dto.getNtceEndde());
		vo.setStopVewAt(dto.getStopVewAt());
		vo.setNtceAt(dto.getNtceAt());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		// Date handling if needed
		return vo;
	}
}