package egovframework.com.cop.smt.mtm.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.mtm.service.EgovMemoTodoService;
import egovframework.com.cop.smt.mtm.service.MemoTodo;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??
 * - ????????controller ?????? ???.
 *
 * ???
 * - ?????????, ??, ???? ???????.
 * - ??????? ?, ??? ??????????.
 * 
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:12:46
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *   2011.8.26	???		IncludedInfo annotation ??
 *
 *          </pre>
 **/
@Controller
public class EgovMemoTodoController {

	@Resource(name = "EgovMemoTodoService")
	protected EgovMemoTodoService memoTodoService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	// Logger log = Logger.getLogger(this.getClass());

	/**
	 * ?? ????????????.
	 * 
	 * @param MemoTodoVO - ?? VO
	 * @return String - ? URL
	 *
	 * @param memoTodoVO
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping("/cop/smt/mtm/selectMemoTodoList.do")
	public String selectMemoTodoList(@ModelAttribute("searchVO") MemoTodoVO memoTodoVO, ModelMap model)
			throws Exception {
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA ?????(2018-12-10, ???
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		memoTodoVO.setPageUnit(propertyService.getInt("pageUnit"));
		memoTodoVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(memoTodoVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(memoTodoVO.getPageUnit());
		paginationInfo.setPageSize(memoTodoVO.getPageSize());

		memoTodoVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		memoTodoVO.setLastIndex(paginationInfo.getLastRecordIndex());
		memoTodoVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		memoTodoVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<String, Object> map = memoTodoService.selectMemoTodoList(memoTodoVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoList";
	}

	/**
	 * ?? ??????.
	 * 
	 * @param MemoTodoVO - ?? VO
	 * @return String - ? URL
	 *
	 * @param memoTodoVO
	 **/
	@RequestMapping("/cop/smt/mtm/selectMemoTodo.do")
	public String selectMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception {
		MemoTodo memoTodo = memoTodoService.selectMemoTodo(memoTodoVO);
		model.addAttribute("memoTodo", memoTodo);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoDetail";
	}

	/**
	 * ?? ???????????.
	 * 
	 * @param MemoTodo - ?? model
	 * @return String - ? URL
	 *
	 * @param memoTodo
	 **/
	@RequestMapping("/cop/smt/mtm/addMemoTodo.do")
	public String addMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/mtm/EgovMemoTodoRegist";

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.KOREA);
		memoTodoVO.setTodoDe(formatter.format(new java.util.Date()));
		memoTodoVO.setWrterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		memoTodoVO.setWrterNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));

		// ?????(??
		model.addAttribute("todoBeginHour", getTimeHH());
		// ?????(??
		model.addAttribute("todoBeginMin", getTimeMM());
		// ????(??
		model.addAttribute("todoEndHour", getTimeHH());
		// ????(??
		model.addAttribute("todoEndMin", getTimeMM());

		return sLocationUrl;
	}

	/**
	 * ?? ????????????.
	 * 
	 * @param MemoTodo - ?? model
	 * @return String - ? URL
	 *
	 * @param memoTodo
	 **/
	@RequestMapping("/cop/smt/mtm/modifyMemoTodo.do")
	public String modifyMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?????(??
		model.addAttribute("todoBeginHour", getTimeHH());
		// ?????(??
		model.addAttribute("todoBeginMin", getTimeMM());
		// ????(??
		model.addAttribute("todoEndHour", getTimeHH());
		// ????(??
		model.addAttribute("todoEndMin", getTimeMM());

		MemoTodoVO resultVO = memoTodoService.selectMemoTodo(memoTodoVO);
		resultVO.setSearchCnd(memoTodoVO.getSearchCnd());
		resultVO.setSearchWrd(memoTodoVO.getSearchWrd());
		resultVO.setSearchBgnDe(memoTodoVO.getSearchBgnDe());
		resultVO.setSearchEndDe(memoTodoVO.getSearchEndDe());
		resultVO.setSearchDe(memoTodoVO.getSearchDe());
		resultVO.setPageIndex(memoTodoVO.getPageIndex());
		model.addAttribute("memoTodoVO", resultVO);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoUpdt";
	}

	/**
	 * ?? ???????.
	 * 
	 * @param MemoTodo - ?? model
	 * @return String - ? URL
	 *
	 * @param memoTodo
	 **/
	@RequestMapping("/cop/smt/mtm/updateMemoTodo.do")
	public String updateMemoTodo(@Valid @ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			MemoTodo memoTodo = memoTodoService.selectMemoTodo(memoTodoVO);
			model.addAttribute("memoTodo", memoTodo);
			return "egovframework/com/cop/smt/mtm/EgovMemoTodoUpdt";
		}

		if (isAuthenticated) {
			memoTodoVO.setTodoBeginTime(
					memoTodoVO.getTodoDe() + memoTodoVO.getTodoBeginHour() + memoTodoVO.getTodoBeginMin());
			memoTodoVO
					.setTodoEndTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoEndHour() + memoTodoVO.getTodoEndMin());

			memoTodoVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			memoTodoService.updateMemoTodo(memoTodoVO);
		}

		return "forward:/cop/smt/mtm/selectMemoTodoList.do";
	}

	/**
	 * ?? ??????.
	 * 
	 * @param MemoTodo - ?? model
	 * @return String - ? URL
	 *
	 * @param memoTodo
	 **/
	@RequestMapping("/cop/smt/mtm/insertMemoTodo.do")
	public String insertMemoTodo(@Valid @ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/mtm/EgovMemoTodoRegist";

		// ?? validate ?
		if (bindingResult.hasErrors()) {
			return sLocationUrl;
		}

		memoTodoVO.setTodoBeginTime(
				memoTodoVO.getTodoDe() + memoTodoVO.getTodoBeginHour() + memoTodoVO.getTodoBeginMin());
		memoTodoVO.setTodoEndTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoEndHour() + memoTodoVO.getTodoEndMin());
		// ?????
		memoTodoVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		memoTodoVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		memoTodoService.insertMemoTodo(memoTodoVO);
		sLocationUrl = "forward:/cop/smt/mtm/selectMemoTodoList.do";

		return sLocationUrl;
	}

	/**
	 * ?? ????????.
	 * 
	 * @param MemoTodo - ?? model
	 * @return String - ? URL
	 *
	 * @param memoTodo
	 **/
	@RequestMapping("/cop/smt/mtm/deleteMemoTodo.do")
	public String deleteMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		memoTodoService.deleteMemoTodo(memoTodoVO);
		return "forward:/cop/smt/mtm/selectMemoTodoList.do";
	}

	/**
	 * ?? ? ?????? ?????????.
	 * 
	 * @param MemoTodoVO - ?? VO
	 * @return String - ? URL
	 *
	 * @param memoTodoVO
	 **/
	@RequestMapping("/cop/smt/mtm/selectMemoTodoListToday.do")
	public String selectMemoTodoListToday(@ModelAttribute("searchVO") MemoTodoVO memoTodoVO, ModelMap model)
			throws Exception {
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA ?????(2018-12-10, ???
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		memoTodoVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.KOREA);
		String strToday = formatter.format(new java.util.Date());
		memoTodoVO.setSearchBgnDe(strToday + "0000");
		memoTodoVO.setSearchEndDe(strToday + "2359");

		List<MemoTodoVO> memoTodoList = memoTodoService.selectMemoTodoListToday(memoTodoVO);
		model.addAttribute("resultList", memoTodoList);
		model.addAttribute("resultToday", strToday);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoListToday";
	}

	/**
	 * ????LIST?????.
	 * 
	 * @return List
	 * @throws
	 **/
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
			codeVO.setCodeNm(sHH);

			listHH.add(codeVO);
		}

		return listHH;
	}

	/**
	 * ???LIST?????.
	 * 
	 * @return List
	 * @throws
	 **/
	private List<ComDefaultCodeVO> getTimeMM() {
		ArrayList<ComDefaultCodeVO> listMM = new ArrayList<>();
		// HashMap hmHHMM;
		for (int i = 0; i < 60; i++) {

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

}
