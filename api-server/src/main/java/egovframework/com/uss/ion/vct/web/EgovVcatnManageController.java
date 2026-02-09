package egovframework.com.uss.ion.vct.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.vct.service.VcatnManage;
import egovframework.com.uss.ion.vct.service.VcatnManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

import com.company.project.service.vacation.EgovVacationService;
import com.company.project.service.vacation.dto.VacationDto;
import com.company.project.service.vacation.EgovAnnualLeaveService;
import com.company.project.service.vacation.dto.AnnualLeaveDto;

@Controller
public class EgovVcatnManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "vacationService")
	private EgovVacationService egovVacationService;

	@Resource(name = "annualLeaveService")
	private EgovAnnualLeaveService egovAnnualLeaveService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@RequestMapping("/uss/ion/vct/EgovVcatnManageListView.do")
	public String selectVcatnManageListView() throws Exception {
		return "egovframework/com/uss/ion/vct/EgovVcatnManageList";
	}

	@IncludedInfo(name = "휴가관리", order = 900, gid = 50)
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnManageList.do")
	public String selectVcatnManageList(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, ModelMap model)
			throws Exception {

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// Check Annual Leave Existence
		AnnualLeaveDto annualLeaveDto = egovAnnualLeaveService.getAnnualLeave(user.getUniqId(),
				Integer.toString(cal.get(java.util.Calendar.YEAR)));

		if (annualLeaveDto == null) {
			// Try finding any annual leave for latest year? Or just use current year.
			// Legacy specific logic: selectIndvdlYrycManage gets info. If null, redirect.
			model.addAttribute("messageTemp",
					egovMessageSource.getMessage("comUssIonVct.vcatnManageList.validate.move"));
			return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycManageList";
		} else {
			/** paging */
			PaginationInfo paginationInfo = new PaginationInfo();
			paginationInfo.setCurrentPageNo(vcatnManageVO.getPageIndex());
			paginationInfo.setRecordCountPerPage(vcatnManageVO.getPageUnit());
			paginationInfo.setPageSize(vcatnManageVO.getPageSize());

			vcatnManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
			vcatnManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
			vcatnManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

			// Fill VO with Annual Leave Info for Display
			vcatnManageVO.setOccrncYrycCo(annualLeaveDto.getOccrncYrycCo());
			vcatnManageVO.setUseYrycCo(annualLeaveDto.getUseYrycCo());
			vcatnManageVO.setRemndrYrycCo(annualLeaveDto.getRemndrYrycCo());
			vcatnManageVO.setApplcntId(user.getUniqId());

			// JPA List
			Pageable pageable = PageRequest.of(vcatnManageVO.getPageIndex() - 1, vcatnManageVO.getPageUnit(),
					Sort.by(Sort.Direction.DESC, "id.bgnde"));
			Page<VacationDto> page = egovVacationService.getVacationList(user.getUniqId(), pageable);

			List<VcatnManageVO> list = page.getContent().stream()
					.map(this::convertToVO)
					.collect(Collectors.toList());

			model.addAttribute("vcatnManageList", list);

			paginationInfo.setTotalRecordCount((int) page.getTotalElements());

			model.addAttribute("vcatnManageVO", vcatnManageVO);
			model.addAttribute("access", user.getOrgnztId()); // Legacy uses orgnztId for access control logic in JSP?
			model.addAttribute("yearList", yearList);
			model.addAttribute("paginationInfo", paginationInfo);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

			return "egovframework/com/uss/ion/vct/EgovVcatnManageList";
		}
	}

	@RequestMapping(value = "/uss/ion/vct/EgovVcatnManageDetail.do")
	public String selectVcatnManage(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		vcatnManageVO.setBgnde(EgovStringUtil.removeMinusChar(vcatnManageVO.getBgnde()));
		vcatnManageVO.setEndde(EgovStringUtil.removeMinusChar(vcatnManageVO.getEndde()));

		VacationDto dto = egovVacationService.getVacation(vcatnManageVO.getApplcntId(), vcatnManageVO.getVcatnSe(),
				vcatnManageVO.getBgnde());
		VcatnManageVO resultVO = convertToVO(dto);

		model.addAttribute("vcatnManageVO", resultVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM056");
			List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

			model.addAttribute("vcatnSeCode", vcatnSeCodeList);
			model.addAttribute("vcatnManage", resultVO);
			return "egovframework/com/uss/ion/vct/EgovVcatnUpdt";
		} else {
			return "egovframework/com/uss/ion/vct/EgovVcatnDetail";
		}
	}

	@RequestMapping(value = "/uss/ion/vct/EgovVcatnRegist.do")
	public String insertViewVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		java.util.Calendar cal = java.util.Calendar.getInstance();
		AnnualLeaveDto annualLeaveDto = egovAnnualLeaveService.getAnnualLeave(user.getUniqId(),
				Integer.toString(cal.get(java.util.Calendar.YEAR)));

		if (annualLeaveDto != null) {
			vcatnManageVO.setOccrncYrycCo(annualLeaveDto.getOccrncYrycCo());
			vcatnManageVO.setUseYrycCo(annualLeaveDto.getUseYrycCo());
			vcatnManageVO.setRemndrYrycCo(annualLeaveDto.getRemndrYrycCo());
		}

		vcatnManageVO.setApplcntId(user.getUniqId());
		vcatnManageVO.setApplcntNm(user.getName());
		vcatnManageVO.setOrgnztNm(user.getOrgnztNm());

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM056");
		List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("vcatnSeCode", vcatnSeCodeList);
		model.addAttribute("vcatnManageVO", vcatnManageVO);

		return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
	}

	@RequestMapping(value = "/uss/ion/vct/insertVcatnManage.do")
	public String insertVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, BindingResult bindingResult,
			SessionStatus status, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("vcatnManageVO", vcatnManageVO);
			return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
		}

		vcatnManage.setApplcntId(user.getUniqId());
		String bgnde = EgovStringUtil.removeMinusChar(vcatnManage.getBgnde());
		String endde = EgovStringUtil.removeMinusChar(vcatnManage.getEndde());

		// Duplicate Check
		int iTemp = egovVacationService.checkVacationDuplicate(user.getUniqId(), bgnde, endde);

		if (iTemp == 0) {
			status.setComplete();

			VacationDto dto = convertToDto(vcatnManage);
			dto.setBgnde(bgnde);
			dto.setEndde(endde);
			dto.setOccrrncYear(bgnde.substring(0, 4));
			dto.setFrstRegisterId(user.getUniqId());
			dto.setConfmAt("R"); // Request

			if (vcatnManage.getSanctnerId() != null) {
				dto.setConfmAt("A"); // Or logic? specific approval?
			}

			egovVacationService.registerVacation(dto);

			model.addAttribute("message", egovMessageSource.getMessage("comUssIonVct.common.inputSuccess"));
			return "forward:/uss/ion/vct/EgovVcatnManageList.do";

		} else {
			model.addAttribute("errorMessage",
					egovMessageSource.getMessage("comUssIonVct.common.validate.duplicate"));

			// Refill data for view
			vcatnManageVO.setApplcntId(user.getUniqId());
			vcatnManageVO.setApplcntNm(user.getName());
			vcatnManageVO.setOrgnztNm(user.getOrgnztNm());
			java.util.Calendar cal = java.util.Calendar.getInstance();
			AnnualLeaveDto annualLeaveDto = egovAnnualLeaveService.getAnnualLeave(user.getUniqId(),
					Integer.toString(cal.get(java.util.Calendar.YEAR)));
			if (annualLeaveDto != null) {
				vcatnManageVO.setOccrncYrycCo(annualLeaveDto.getOccrncYrycCo());
				vcatnManageVO.setUseYrycCo(annualLeaveDto.getUseYrycCo());
				vcatnManageVO.setRemndrYrycCo(annualLeaveDto.getRemndrYrycCo());
			}

			model.addAttribute("vcatnManageVO", vcatnManageVO);

			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM056");
			List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("vcatnSeCode", vcatnSeCodeList);

			return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
		}
	}

	@RequestMapping(value = "/uss/ion/vct/updtVcatnManage.do")
	public String updtVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		VacationDto dto = convertToDto(vcatnManage);
		dto.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		dto.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		dto.setLastUpdusrId(user.getUniqId());

		egovVacationService.updateVacation(dto);
		status.setComplete();

		model.addAttribute("message", egovMessageSource.getMessage("comUssIonVct.common.inputSuccess"));
		return "forward:/uss/ion/vct/EgovVcatnManageList.do";
	}

	@RequestMapping(value = "/uss/ion/vct/deleteVcatnManage.do")
	public String deleteVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage, SessionStatus status,
			ModelMap model) throws Exception {
		String bgnde = EgovStringUtil.removeMinusChar(vcatnManage.getBgnde());
		egovVacationService.deleteVacation(vcatnManage.getApplcntId(), vcatnManage.getVcatnSe(), bgnde);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/vct/EgovVcatnManageList.do";
	}

	@IncludedInfo(name = "휴가승인관리", order = 901, gid = 50)
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnConfmList.do")
	public String selectVcatnManageConfmList(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			ModelMap model) throws Exception {

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(vcatnManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(vcatnManageVO.getPageUnit());
		paginationInfo.setPageSize(vcatnManageVO.getPageSize());

		Pageable pageable = PageRequest.of(vcatnManageVO.getPageIndex() - 1, vcatnManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "id.bgnde"));

		// Legacy: If sanctnerId is set, search by it. ConfmAt filter is implicit?
		// Legacy passes searchYear, searchMonth, etc. But JPA queries I added are
		// mainly by sanctner.
		// I'll use findBySanctnerIdAndConfmAt if available or just all for Sanctner.
		Page<VacationDto> page = egovVacationService.getVacationListConfm(user.getUniqId(), null, pageable);

		List<VcatnManageVO> list = page.getContent().stream().map(this::convertToVO).collect(Collectors.toList());

		model.addAttribute("vcatnManageList", list);

		paginationInfo.setTotalRecordCount((int) page.getTotalElements());
		model.addAttribute("yearList", yearList);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/vct/EgovVcatnConfmList";
	}

	@RequestMapping(value = "/uss/ion/vct/EgovVcatnConfm.do")
	public String selectVcatnConfm(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, ModelMap model) throws Exception {

		vcatnManageVO.setBgnde(EgovStringUtil.removeMinusChar(vcatnManageVO.getBgnde()));
		vcatnManageVO.setEndde(EgovStringUtil.removeMinusChar(vcatnManageVO.getEndde()));

		VacationDto dto = egovVacationService.getVacation(vcatnManageVO.getApplcntId(), vcatnManageVO.getVcatnSe(),
				vcatnManageVO.getBgnde());
		VcatnManageVO resultVO = convertToVO(dto);

		model.addAttribute("vcatnManageVO", resultVO);
		model.addAttribute("vcatnManage", resultVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/vct/EgovVcatnConfm";
	}

	@RequestMapping(value = "/uss/ion/vct/updtVcatnConfm.do")
	public String updtVcatnManageConfm(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String bgnde = EgovStringUtil.removeMinusChar(vcatnManage.getBgnde());

		egovVacationService.approveVacation(vcatnManage.getApplcntId(), vcatnManage.getVcatnSe(), bgnde,
				user.getUniqId(), vcatnManage.getConfmAt(), vcatnManage.getReturnResn(), user.getUniqId());

		return "forward:/uss/ion/vct/EgovVcatnConfmList.do";
	}

	@RequestMapping("/uss/ion/vct/EgovVcatnReturn.do")
	public String selectSanctnerListPopup(@ModelAttribute("vcatnManage") VcatnManage vcatnManage, ModelMap model)
			throws Exception {
		return "egovframework/com/uss/ion/vct/EgovVcatnReturn";
	}

	private VcatnManageVO convertToVO(VacationDto dto) {
		if (dto == null)
			return null;
		VcatnManageVO vo = new VcatnManageVO();
		vo.setApplcntId(dto.getApplcntId());
		vo.setVcatnSe(dto.getVcatnSe());
		vo.setBgnde(dto.getBgnde());
		vo.setEndde(dto.getEndde());
		vo.setReqstDe(dto.getReqstDe());
		vo.setVcatnResn(dto.getVcatnResn());
		vo.setOccrrncYear(dto.getOccrrncYear());
		vo.setNoonSe(dto.getNoonSe());
		vo.setSanctnerId(dto.getSanctnerId());
		vo.setConfmAt(dto.getConfmAt());
		// vo.setSanctnDt(dto.getSanctnDt()); // Date type conflict handling if needed
		vo.setReturnResn(dto.getReturnResn());
		vo.setInfrmlSanctnId(dto.getInfrmlSanctnId());
		vo.setApplcntNm(dto.getApplcntNm());
		vo.setOrgnztNm(dto.getOrgnztNm());
		return vo;
	}

	private VacationDto convertToDto(VcatnManage vo) {
		VacationDto dto = new VacationDto();
		dto.setApplcntId(vo.getApplcntId());
		dto.setVcatnSe(vo.getVcatnSe());
		dto.setBgnde(vo.getBgnde());
		dto.setEndde(vo.getEndde());
		dto.setReqstDe(vo.getReqstDe());
		dto.setVcatnResn(vo.getVcatnResn());
		dto.setOccrrncYear(vo.getOccrrncYear());
		dto.setNoonSe(vo.getNoonSe());
		dto.setSanctnerId(vo.getSanctnerId());
		dto.setConfmAt(vo.getConfmAt());
		dto.setReturnResn(vo.getReturnResn());
		return dto;
	}
}
