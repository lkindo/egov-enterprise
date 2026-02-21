package egovframework.com.uss.ion.bnt.web;

import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.bnt.service.BndtCeckManage;
import egovframework.com.uss.ion.bnt.service.BndtCeckManageVO;
import egovframework.com.uss.ion.bnt.service.BndtDiary;
import egovframework.com.uss.ion.bnt.service.BndtDiaryVO;
import egovframework.com.uss.ion.bnt.service.BndtManage;
import egovframework.com.uss.ion.bnt.service.BndtManageVO;
import egovframework.com.uss.ion.bnt.service.EgovBndtManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovFileUploadUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * <pre>
 * ??
 * - ??? ????controller ?????? ???.
 *
 * ???
 * - ??? ?????, ??, ???? ?????????.
 * - ??? ??? ?, ??????.
 * </pre>
 * 
 * @author ??
 * @version 1.0
 * @created 06-15-2010 ?? 2:08:56 *
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *  ????             ????            ????
 *  ----------  --------    ---------------------------

 *
 *          </pre>
 **/
/**
 * <pre>
 * ??
 * - ??? ????controller ?????? ???.
 *
 * ???
 * - ??? ?????, ??, ???? ?????????.
 * - ??? ??? ?, ??????.
 * </pre>
 * 
 * @author ??
 * @since 2010.06.15
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.15 ??            ????
 *   2011.08.26 ???          IncludedInfo annotation ??
 *   2018.08.29 ???          xlsx ????? ?????
 *   2020.11.02 ???          KISA ?? ??- ????
 *   2025.08.05  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovBndtManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovBndtManageService")
	private EgovBndtManageService egovBndtManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ????? ???
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@SuppressWarnings("unused")
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
// 	@RequestMapping("/uss/ion/bnt/EgovBndtManageList.do")
	public String selectBndtManageListView(@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// ??? ????
		// model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ?
		// "" : (String)commandMap.get("searchKeyword"));
		// model.addAttribute("searchCondition", commandMap.get("searchCondition") ==
		// null ? "" : (String)commandMap.get("searchCondition"));

		java.util.Calendar cal = java.util.Calendar.getInstance();

		String sYear = (String) commandMap.get("year");
		String sMonth = (String) commandMap.get("month");

		int iYear = cal.get(java.util.Calendar.YEAR);
		int iMonth = cal.get(java.util.Calendar.MONTH);
		int iDate = cal.get(java.util.Calendar.DATE);

		// ????
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
		bndtManageVO.setBndtDe(sSearchDate);

		bndtManageVO.setBndtManageList(egovBndtManageService.selectBndtManageList(bndtManageVO));
		model.addAttribute("bndtManageList", bndtManageVO.getBndtManageList());

		return "egovframework/com/uss/ion/bnt/EgovBndtManageList";
	}

	/**
	 * ????? ???? ????????????.
	 * 
	 * @param bndtManageVO - ????VO
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/selectBndtManageList.do")
	public String selectBndtManageList(@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, ModelMap model)
			throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(bndtManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(bndtManageVO.getPageUnit());
		paginationInfo.setPageSize(bndtManageVO.getPageSize());

		bndtManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		bndtManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		bndtManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
		bndtManageVO.setBndtManageList(egovBndtManageService.selectBndtManageList(bndtManageVO));

		model.addAttribute("bndtManageList", bndtManageVO.getBndtManageList());

		int totCnt = egovBndtManageService.selectBndtManageListTotCnt(bndtManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/bnt/EgovBndtManageList";
	}

	/**
	 * ?????? ???????.
	 * 
	 * @param bndtManageVO - ????VO
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtManageDetail.do")
	public String selectBndtManage(@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO,
			@ModelAttribute("bndtManage") BndtManage bndtManage, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?? ?

		BndtManageVO resultVO = egovBndtManageService.selectBndtManage(bndtManageVO);

		model.addAttribute("bndtManageVO", resultVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {
			bndtManage.setBndtDe(resultVO.getBndtDe());
			bndtManage.setBndtId(resultVO.getBndtId());
			bndtManage.setRemark(resultVO.getRemark());
			model.addAttribute("bndtManage", bndtManage);

			return "egovframework/com/uss/ion/bnt/EgovBndtManageUpdt";
		} else {
			return "egovframework/com/uss/ion/bnt/EgovBndtManageDetail";
		}
		// model.addAttribute("bndtManage",
		// egovBndtManageService.selectBndtManage(bndtManageVO));
		// model.addAttribute("message",
		// egovMessageSource.getMessage("success.common.select"));
		// return "egovframework/com/uss/ion/ans/EgovBndtManageUpdt";
	}

	/**
	 * ????? ??? ????.
	 * 
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtManageRegist.do")
	public String insertViewBndtManage(@ModelAttribute("bndtManage") BndtManage bndtManage,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, ModelMap model) throws Exception {

		bndtManage.setBndtDe(EgovDateUtil.formatDate(bndtManage.getBndtDe(), "-"));
		model.addAttribute("bndtManage", bndtManage);
		model.addAttribute("bndtManageVO", bndtManageVO);

		return "egovframework/com/uss/ion/bnt/EgovBndtManageRegist";
	}

	/**
	 * ????? ?????.
	 * 
	 * @param bndtManage - ????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/insertBndtManage.do")
	public String insertBndtManage(@ModelAttribute("bndtManage") BndtManage bndtManage,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("bndtManageVO", bndtManageVO);
			return "egovframework/com/uss/ion/bnt/EgovBndtManageRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			bndtManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			egovBndtManageService.insertBndtManage(bndtManage);
			// model.addAttribute("bndtManage",
			// egovBndtManageService.insertBndtManage(bndtManage));

			return "forward:/uss/ion/bnt/EgovBndtManageList.do";

		}
	}

	/**
	 * ????????? ????.
	 * 
	 * @param bndtManage - ????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/updtBndtManage.do")
	public String updtBndtManage(@ModelAttribute("bndtManage") BndtManage bndtManage,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("bndtManageVO", bndtManageVO);
			return "egovframework/com/uss/ion/bnt/EgovBndtManageUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			bndtManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			egovBndtManageService.updtBndtManage(bndtManage);
			return "forward:/uss/ion/bnt/EgovBndtManageList.do";

		}
	}

	/**
	 * ????????? ?????.
	 * 
	 * @param bndtManage - ????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/deleteBndtManage.do")
	public String deleteBndtManage(@ModelAttribute("bndtManage") BndtManage bndtManage, SessionStatus status,
			ModelMap model) throws Exception {

		int iDiaryTotCnt = egovBndtManageService.selectBndtDiaryTotCnt(bndtManage);
		if (iDiaryTotCnt == 0) {
			egovBndtManageService.deleteBndtManage(bndtManage);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
			return "forward:/uss/ion/bnt/EgovBndtManageList.do";
		} else {

			BndtManageVO bndtManageVO = new BndtManageVO();
			bndtManageVO.setBndtDe(bndtManage.getBndtDe());
			bndtManageVO.setBndtId(bndtManage.getBndtId());

			bndtManageVO = egovBndtManageService.selectBndtManage(bndtManageVO);

			model.addAttribute("bndtManageVO", bndtManageVO);
			model.addAttribute("errorMessage", "?        ??????????       ???        ?         ????????      ??");

			bndtManage.setBndtDe(bndtManageVO.getBndtDe());
			bndtManage.setBndtId(bndtManageVO.getBndtId());
			bndtManage.setRemark(bndtManageVO.getRemark());
			model.addAttribute("bndtManage", bndtManage);

			return "egovframework/com/uss/ion/bnt/EgovBndtManageUpdt";
		}
	}

	/****** ?? ???*******/
	/**
	 * ????????? ????? ?????.
	 * 
	 * @param bndtCeckManageVO - ?? VO
	 * @return String - ? Url
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtCeckManageList.do")
	public String selectBndtCeckManageList(@ModelAttribute("bndtCeckManageVO") BndtCeckManageVO bndtCeckManageVO,
			ModelMap model) throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(bndtCeckManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(bndtCeckManageVO.getPageUnit());
		paginationInfo.setPageSize(bndtCeckManageVO.getPageSize());

		bndtCeckManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		bndtCeckManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		bndtCeckManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM071");
		List<CmmnDetailCode> bndtCeckSeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("bndtCeckSeList", bndtCeckSeList);

		bndtCeckManageVO.setBndtCeckManageList(egovBndtManageService.selectBndtCeckManageList(bndtCeckManageVO));
		model.addAttribute("bndtCeckManageList", bndtCeckManageVO.getBndtCeckManageList());

		int totCnt = egovBndtManageService.selectBndtCeckManageListTotCnt(bndtCeckManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("bndtCeckManageVO", bndtCeckManageVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageList";
	}

	/**
	 * ??????????????.
	 * 
	 * @param bndtCeckManageVO - ?? VO
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtCeckManage.do")
	public String selectBndtCeckManage(@ModelAttribute("bndtCeckManageVO") BndtCeckManageVO bndtCeckManageVO,
			@ModelAttribute("bndtCeckManage") BndtCeckManage bndtCeckManage, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?? ?

		BndtCeckManageVO resultBndtCeckManageVO = egovBndtManageService.selectBndtCeckManage(bndtCeckManageVO);

		model.addAttribute("bndtCeckManageVO", resultBndtCeckManageVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {
			BndtCeckManage resultBndtCeckManage = new BndtCeckManage();
			resultBndtCeckManage.setBndtCeckSe(resultBndtCeckManageVO.getBndtCeckSe());
			resultBndtCeckManage.setBndtCeckCd(resultBndtCeckManageVO.getBndtCeckSe());
			resultBndtCeckManage.setBndtCeckCdNm(resultBndtCeckManageVO.getBndtCeckCdNm());
			resultBndtCeckManage.setUseAt(resultBndtCeckManageVO.getUseAt());
			model.addAttribute("bndtCeckManage", resultBndtCeckManage);
			return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageUpdt";
		} else {
			return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageDetail";
		}
	}

	/**
	 * ?? ? ??? ????.
	 * 
	 * @return String - ? Url
	 **/
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtCeckManageRegist.do")
	public String insertViewBndtCeckManage(@ModelAttribute("bndtCeckManage") BndtCeckManage bndtCeckManage,
			ModelMap model) throws Exception {
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM071");
		List<CmmnDetailCode> bndtCeckSeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("bndtCeckSeList", bndtCeckSeList);

		bndtCeckManage.setBndtCeckCd("");
		bndtCeckManage.setBndtCeckCdNm("");
		bndtCeckManage.setBndtCeckSe("");
		return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageRegist";
	}

	/**
	 * ??????????.
	 * 
	 * @param bndtCeckManage - ?? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/insertBndtCeckManage.do")
	public String insertBndtCeckManage(@ModelAttribute("bndtCeckManage") BndtCeckManage bndtCeckManage,
			@ModelAttribute("bndtCeckManageVO") BndtCeckManageVO bndtCeckManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM071");
			List<CmmnDetailCode> bndtCeckSeList = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("bndtCeckSeList", bndtCeckSeList);
			model.addAttribute("bndtCeckManageVO", bndtCeckManageVO);
			return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			bndtCeckManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			status.setComplete();

			if (egovBndtManageService.selectBndtCeckManageDplctAt(bndtCeckManage) == 0) {
				egovBndtManageService.insertBndtCeckManage(bndtCeckManage);
				model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
				return "forward:/uss/ion/bnt/EgovBndtCeckManageList.do";
			} else {
				ComDefaultCodeVO vo = new ComDefaultCodeVO();
				vo.setCodeId("COM071");
				List<CmmnDetailCode> bndtCeckSeList = cmmUseService.selectCmmCodeDetail(vo);
				model.addAttribute("bndtCeckSeList", bndtCeckSeList);
				model.addAttribute("bndtCeckManageVO", bndtCeckManageVO);
				model.addAttribute("dplctMessage", "??  ? ?         ???         ????      ?? ??  ???         ?????         ??            ??);"); // force closed
				return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageRegist";
			}
		}
	}

	/**
	 * ?????????????.
	 * 
	 * @param bndtCeckManage - ?? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/updtBndtCeckManage.do")
	public String updtBndtCeckManage(@ModelAttribute("bndtCeckManage") BndtCeckManage bndtCeckManage,
			@ModelAttribute("bndtCeckManageVO") BndtCeckManageVO bndtCeckManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("bndtCeckManageVO", bndtCeckManageVO);
			return "egovframework/com/uss/ion/bnt/EgovBndtCeckManageUpdt";
		} else {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			bndtCeckManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			egovBndtManageService.updtBndtCeckManage(bndtCeckManage);
			return "forward:/uss/ion/bnt/EgovBndtCeckManageList.do";

		}
	}

	/**
	 * ??????????????.
	 * 
	 * @param bndtCeckManage - ?? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/deleteBndtCeckManage.do")
	public String deleteBndtCeckManage(@ModelAttribute("bndtCeckManage") BndtCeckManage bndtCeckManage,
			SessionStatus status, ModelMap model) throws Exception {

		egovBndtManageService.deleteBndtCeckManage(bndtCeckManage);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/bnt/EgovBndtCeckManageList.do";
	}

	/****** ???? *******/

	/**
	 * ???????????????.
	 * 
	 * @param bndtDiaryVO - ???? VO
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/selectBndtDiary.do")
	public String selectBndtDiary(@ModelAttribute("bndtDiaryVO") BndtDiaryVO bndtDiaryVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?? ?

		bndtDiaryVO.setBndtDiaryList(egovBndtManageService.selectBndtDiary(bndtDiaryVO));
		model.addAttribute("bndtDiaryList", bndtDiaryVO.getBndtDiaryList());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("insert")) {
			bndtDiaryVO.setBndtDe(bndtDiaryVO.getBndtDe());
			bndtDiaryVO.setBndtId(bndtDiaryVO.getBndtId());
			model.addAttribute("bndtDiaryVO", bndtDiaryVO);
			return "egovframework/com/uss/ion/bnt/EgovBndtDiaryRegist";
		} else if (sCmd.equals("updt")) {
			return "egovframework/com/uss/ion/bnt/EgovBndtDiaryUpdt";
		} else {
			return "egovframework/com/uss/ion/bnt/EgovBndtDiaryDetail";
		}
	}

	/**
	 * ????????????.
	 * 
	 * @param bndtDiary - ???? model
	 * @return String - ? Url
	 **/
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/bnt/insertBndtDiary.do")
	public String insertBndtDiary(@RequestParam("diaryForInsert") String diaryForInsert,
			@ModelAttribute("bndtDiary") BndtDiary bndtDiary, @ModelAttribute("bndtDiaryVO") BndtDiaryVO bndtDiaryVO,
			BindingResult bindingResult, SessionStatus status, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?? ?

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		status.setComplete();

		bndtDiary.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		egovBndtManageService.insertBndtDiary(bndtDiary, diaryForInsert);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
		return "forward:/uss/ion/bnt/EgovBndtManageList.do";
	}

	/**
	 * ???????????????.
	 * 
	 * @param bndtDiary - ???? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/updtBndtDiary.do")
	public String updtBndtDiary(@RequestParam("diaryForUpdt") String diaryForUpdt,
			@ModelAttribute("bndtDiary") BndtDiary bndtDiary, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		bndtDiary.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		egovBndtManageService.updtBndtDiary(bndtDiary, diaryForUpdt);
		return "forward:/uss/ion/bnt/EgovBndtManageList.do";
	}

	/**
	 * ????????????????.
	 * 
	 * @param bndtDiary - ???? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/deleteBndtDiary.do")
	public String deleteBndtDiary(@ModelAttribute("bndtDiary") BndtDiary bndtDiary, SessionStatus status,
			ModelMap model) throws Exception {

		egovBndtManageService.deleteBndtDiary(bndtDiary);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/bnt/EgovBndtManageList.do";
	}

	/**
	 * ????? ? ?????????
	 * 
	 * @param bndtManageVO BndtManageVO
	 * @param request      HttpServletRequest
	 * @return ????? "ion bnt/EgovBndtManageListPop"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/uss/ion/bnt/EgovBndtManageListPop.do")
	public String selectBndtManageBnde(final HttpServletRequest request,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {
		// 0. Spring Security ?????????

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return "egovframework/com/uss/ion/bnt/EgovBndtManageBndeListPop";
	}

	@RequestMapping(value = "/uss/ion/bnt/EgovBndtManageListPopAction.do")
	public String selectBndtManageBndeAction(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {
		String resultMsg = "";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?? ?

		// 0. Spring Security ?????????

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (sCmd.equals("bnde")) {
			// final MultipartHttpServletRequest multiRequest =
			// (MultipartHttpServletRequest) request;
			final Map<String, MultipartFile> files = multiRequest.getFileMap();
			Iterator<Entry<String, MultipartFile>> itr = files.entrySet().iterator();
			MultipartFile file;
			while (itr.hasNext()) {
				Entry<String, MultipartFile> entry = itr.next();
				file = entry.getValue();
				if (!"".equals(file.getOriginalFilename())) {
					String ext = EgovFileUploadUtil.getFileExtension(file.getOriginalFilename());
					if ("xlsx".equals(ext)) {
						InputStream is = null;
						try {
							is = file.getInputStream();
							model.addAttribute("bndtManageList", egovBndtManageService.selectBndtManageBndeX(is));
						} catch (IOException e) {
							throw new IOException(e);
						} finally {
							if (is != null) {// 2022.01.Possible null pointer dereference in method on exception path ??
								is.close();
							}
						}
					} else if ("xls".equals(ext)) {
						InputStream is = null;
						try {
							is = file.getInputStream();
							model.addAttribute("bndtManageList", egovBndtManageService.selectBndtManageBnde(is));
						} catch (IOException e) {
							throw new IOException(e);
						} finally {
							if (is != null) {// 2022.01.Possible null pointer dereference in method on exception path ??
								is.close();
							}
						}
					} else {
						throw new RuntimeException(egovMessageSource.getMessage("errors.file.extension"));
					}
				} else {
					resultMsg = egovMessageSource.getMessage("fail.common.msg");
				}
			}
			model.addAttribute("resultMsg", resultMsg);
		}
		return "egovframework/com/uss/ion/bnt/EgovBndtManageBndeListPop";
	}

	/**
	 * ??????????.
	 * 
	 * @param bndtManageVO - ????VO
	 * @param String       - ????
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/uss/ion/bnt/insertBndtManageBnde.do")
	public String insertBndtManageBnde(@RequestParam("checkedBndtManageForInsert") String checkedBndtManageForInsert,
			@ModelAttribute("bndtManageVO") BndtManageVO bndtManageVO, SessionStatus status, ModelMap model)
			throws Exception {
		int iTemp = egovBndtManageService.selectBndtManageMonthCnt(bndtManageVO);
		if (iTemp == 0) {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			bndtManageVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			egovBndtManageService.insertBndtManageBnde(bndtManageVO, checkedBndtManageForInsert);
			status.setComplete();
			model.addAttribute("message", "true");
			return "egovframework/com/uss/ion/bnt/EgovBndtManageList";
		} else {
			String sTempMessage = "Invalid Date";
			model.addAttribute("message", sTempMessage);
			return "egovframework/com/uss/ion/bnt/EgovBndtManageBndeListPop";
		}
	}

}
