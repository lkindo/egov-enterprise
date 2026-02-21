package egovframework.com.sym.log.slg.web;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

import com.company.project.service.syshistory.EgovSystemHistoryService;
import com.company.project.service.syshistory.dto.SystemHistoryDto;
import com.company.project.web.adapter.SystemHistoryAdapter;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.log.slg.service.SysHistory;
import egovframework.com.sym.log.slg.service.SysHistoryVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * ??????????Controller (JPA ?)
 **/
@Controller
@RequiredArgsConstructor
public class EgovSysHistoryController {

	private final EgovSystemHistoryService egovSystemHistoryService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * ?????????
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/log/slg/SelectSysHistoryList.do")
	public String selectSysHistoryList(@ModelAttribute("searchVO") SysHistoryVO historyVO, ModelMap model)
			throws Exception {

		historyVO.setPageUnit(propertyService.getInt("pageUnit"));
		historyVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(historyVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(historyVO.getPageUnit());
		paginationInfo.setPageSize(historyVO.getPageSize());

		// JPA ????
		int pageIndex = historyVO.getPageIndex() > 0 ? historyVO.getPageIndex() - 1 : 0;
		Page<SystemHistoryDto> pageResult = egovSystemHistoryService.getSystemHistoryList(
				historyVO.getSearchWrd(),
				PageRequest.of(pageIndex, historyVO.getPageUnit(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")));

		List<SysHistoryVO> resultList = pageResult.stream()
				.map(SystemHistoryAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);
		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/log/slg/EgovSysHistList";
	}

	/**
	 * ??????? ??
	 **/
	@RequestMapping(value = "/sym/log/slg/InqireSysHistory.do")
	public String selectSysHistory(@ModelAttribute("searchVO") SysHistoryVO historyVO,
			@RequestParam("histId") String histId, ModelMap model) throws Exception {

		SystemHistoryDto dto = egovSystemHistoryService.getSystemHistory(histId.trim());
		SysHistoryVO vo = SystemHistoryAdapter.toVO(dto);
		model.addAttribute("result", vo);
		return "egovframework/com/sym/log/slg/EgovSysHistInqire";
	}

	/**
	 * ??????? ?
	 **/
	@RequestMapping(value = "/sym/log/slg/AddSysHistory.do")
	public String addSysHistory(@ModelAttribute("searchVO") SysHistoryVO historyVO, ModelMap model) throws Exception {

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM002");
		List<CmmnDetailCode> resultCOM002List = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("resultList", resultCOM002List);
		return "egovframework/com/sym/log/slg/EgovSysHistRegist";
	}

	/**
	 * ???????
	 **/
	@RequestMapping(value = "/sym/log/slg/InsertSysHistory.do")
	public String insertSysHistory(final MultipartHttpServletRequest multiRequest,
			@Valid @ModelAttribute("history") SysHistory history, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM002");
			List<CmmnDetailCode> resultCOM002List = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("resultList", resultCOM002List);
			return "egovframework/com/sym/log/slg/EgovSysHistRegist";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			List<FileVO> fvoList = null;
			String atchFileId = "";
			final List<MultipartFile> files = multiRequest.getFiles("file_1");
			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "SHF_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList);
			}

			// JPA ?????
			SystemHistoryDto dto = SystemHistoryDto.builder()
					.sysNm(history.getSysNm())
					.histSeCode(history.getHistSeCode())
					.histCn(history.getHistCn())
					.atchFileId(atchFileId)
					.build();
			egovSystemHistoryService.createSystemHistory(loginVO.getUniqId(), dto);
		}

		status.setComplete();
		return "forward:/sym/log/slg/SelectSysHistoryList.do";
	}

	/**
	 * ???????? ?
	 **/
	@RequestMapping(value = "/sym/log/slg/ModifySysHistory.do")
	public String modifySysHistory(@ModelAttribute("searchVO") SysHistoryVO historyVO, ModelMap model)
			throws Exception {

		SystemHistoryDto dto = egovSystemHistoryService.getSystemHistory(historyVO.getHistId());
		SysHistoryVO history = SystemHistoryAdapter.toVO(dto);
		model.addAttribute("history", history);

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM002");
		List<CmmnDetailCode> resultCOM002List = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("resultList", resultCOM002List);
		return "egovframework/com/sym/log/slg/EgovSysHistUpdt";
	}

	/**
	 * ????????
	 **/
	@RequestMapping(value = "/sym/log/slg/UpdateSysHistory.do")
	public String updateSysHistory(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") SysHistoryVO historyVO, @Valid @ModelAttribute("history") SysHistory history,
			BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("history", history);
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM002");
			List<CmmnDetailCode> resultCOM002List = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("resultList", resultCOM002List);
			return "egovframework/com/sym/log/slg/EgovSysHistUpdt";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			String atchFileId = history.getAtchFileId();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");
			if (!files.isEmpty()) {
				if ("".equals(atchFileId) || atchFileId == null) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "SHF_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);
				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "SHF_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}

			// JPA ?????
			SystemHistoryDto dto = SystemHistoryDto.builder()
					.sysNm(history.getSysNm())
					.histSeCode(history.getHistSeCode())
					.histCn(history.getHistCn())
					.atchFileId(atchFileId)
					.build();
			egovSystemHistoryService.updateSystemHistory(history.getHistId(), loginVO.getUniqId(), dto);
		}

		status.setComplete();
		return "forward:/sym/log/slg/SelectSysHistoryList.do";
	}

	/**
	 * ??????????
	 **/
	@RequestMapping(value = "/sym/log/slg/DeleteSysHistory.do")
	public String deleteSysHistory(@ModelAttribute("history") SysHistory history, SessionStatus status, ModelMap model)
			throws Exception {

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			egovSystemHistoryService.deleteSystemHistory(history.getHistId(), loginVO.getUniqId());
		}

		status.setComplete();
		return "forward:/sym/log/slg/SelectSysHistoryList.do";
	}
}
