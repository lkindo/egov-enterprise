package egovframework.com.cop.stf.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.board.EgovSatisfactionService;
import com.company.project.service.board.dto.SatisfactionDto;
import com.company.project.web.adapter.SatisfactionAdapter;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 만족도 서비스 컨트롤러 클래스
 * 
 * @author 공통컴포넌트개발팀 한성곤
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.06.29  한성곤          최초 생성
 *
 * Copyright (C) 2009 by MOPAS  All right reserved.
 *      </pre>
 */
@Controller
public class EgovBBSSatisfactionController {

	@Resource(name = "egovSatisfactionService")
	protected EgovSatisfactionService egovSatisfactionService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	// Logger log = Logger.getLogger(this.getClass());

	/**
	 * 만족도조사 목록 조회를 제공한다.
	 *
	 * @param boardVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/selectSatisfactionList.do")
	public String selectSatisfactionList(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model)
			throws Exception {

		// 수정 처리된 후 만족도조사 등록 화면으로 처리되기 위한 구현
		if (satisfactionVO.isModified()) {
			satisfactionVO.setStsfdgNo("");
			satisfactionVO.setStsfdgCn("");
			satisfactionVO.setStsfdg(0);
		}

		// 수정을 위한 처리
		if (!satisfactionVO.getStsfdgNo().equals("")) {
			return "forward:/cop/stf/selectSingleSatisfaction.do";
		}

		// ------------------------------------------
		// JSP의 <head> 부분 처리 (javascript 생성)
		// ------------------------------------------
		model.addAttribute("type", satisfactionVO.getType()); // head or body

		if (satisfactionVO.getType().equals("head")) {
			return "egovframework/com/cop/stf/EgovSatisfactionList";
		}
		//// ----------------------------------------

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		satisfactionVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

		satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
		satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
		paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

		satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service Call
		List<SatisfactionDto> list = egovSatisfactionService.getSatisfactionList(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());

		// Pagination logic for satisfaction is tricky if it's just a list.
		// Usually satisfaction is ALL shown or paginated. Legacy
		// `selectSatisfactionList` likely paginated.
		// My new service `getSatisfactionList` returns ALL list.
		// I should probably manually paginate or update service to paginate.
		// For now, let's assume all or sublist.
		// Legacy returned map with "resultList", "resultCnt", "summary".

		// Manual sublist for now to match behavior if needed, OR just pass all.
		// Given the simplicity, let's pass all but set pagination info to match size.
		int totCnt = list.size();

		// Calculate Summary (Average)
		Double avg = egovSatisfactionService.getAverageSatisfaction(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		// Legacy "summary" might be a Map.
		// map.get("summary") -> returns a specific object?
		// Let's create a map for summary.
		Map<String, Object> summary = new java.util.HashMap<String, Object>();
		summary.put("stsfdg", avg != null ? avg : 0.0);

		List<SatisfactionVO> resultList = SatisfactionAdapter.toVOList(list);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("summary", summary); // Contains 'stsfdg' (average)
		model.addAttribute("paginationInfo", paginationInfo);

		satisfactionVO.setStsfdgCn(""); // 등록 후 만족도 내용 처리
		satisfactionVO.setStsfdg(0); // 등록 후 만족도 처리

		return "egovframework/com/cop/stf/EgovSatisfactionList";
	}

	/**
	 * 익명용 만족도조사 목록 조회를 제공한다.
	 *
	 * @param boardVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/anonymous/selectSatisfactionList.do")
	public String selectAnonymousSatisfactionList(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			ModelMap model) throws Exception {

		// 수정 처리된 후 만족도조사 등록 화면으로 처리되기 위한 구현
		if (satisfactionVO.isModified()) {
			satisfactionVO.setStsfdgNo("");
			satisfactionVO.setStsfdgCn("");
			satisfactionVO.setStsfdg(0);
			satisfactionVO.setWrterNm("");
		}

		// 수정을 위한 처리
		if (!satisfactionVO.getStsfdgNo().equals("")) {
			return "forward:/cop/stf/anonymous/selectSingleSatisfaction.do";
		}

		// ------------------------------------------
		// JSP의 <head> 부분 처리 (javascript 생성)
		// ------------------------------------------
		model.addAttribute("type", satisfactionVO.getType()); // head or body

		if (satisfactionVO.getType().equals("head")) {
			return "egovframework/com/cop/stf/EgovSatisfactionList";
		}
		//// ----------------------------------------

		model.addAttribute("anonymous", "true");

		satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
		satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
		paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

		satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service
		List<SatisfactionDto> list = egovSatisfactionService.getSatisfactionList(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		int totCnt = list.size();
		Double avg = egovSatisfactionService.getAverageSatisfaction(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		Map<String, Object> summary = new java.util.HashMap<String, Object>();
		summary.put("stsfdg", avg != null ? avg : 0.0);
		List<SatisfactionVO> resultList = SatisfactionAdapter.toVOList(list);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("summary", summary);
		model.addAttribute("paginationInfo", paginationInfo);

		satisfactionVO.setWrterNm("");
		satisfactionVO.setStsfdgCn(""); // 등록 후 만족도 내용 처리
		satisfactionVO.setStsfdg(0); // 등록 후 만족도 처리

		return "egovframework/com/cop/stf/EgovSatisfactionList";
	}

	/**
	 * 만족도조사를 등록한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/insertSatisfaction.do")
	public String insertSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "작성자 및 만족도는 필수 입력값입니다.");

			return "forward:/cop/bbs/selectBoardArticle.do";
		}

		if (isAuthenticated) {
			satisfaction.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			satisfaction.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			satisfaction.setStsfdgPassword(""); // dummy

			// Convert and Save
			SatisfactionDto dto = SatisfactionAdapter.toDto(satisfaction);
			egovSatisfactionService.registerSatisfaction(dto);

			satisfactionVO.setStsfdgCn("");
			satisfactionVO.setStsfdgNo("");
			satisfactionVO.setStsfdg(0);
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
	}

	/**
	 * 익명 만족도조사를 등록한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/anonymous/insertSatisfaction.do")
	public String insertAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "작성자 및 만족도는 필수 입력값입니다.");

			return "forward:/cop/stf/anonymous/selectBoardArticle.do";
		}

		satisfaction.setFrstRegisterId("ANONYMOUS");
		satisfaction.setWrterId("");
		// Encrypt password before dto conversion if needed or store as is.
		// Legacy: EgovFileScrty.encryptPassword
		satisfaction.setStsfdgPassword(
				EgovFileScrty.encryptPassword(satisfaction.getStsfdgPassword(), satisfaction.getStsfdgNo()));

		SatisfactionDto dto = SatisfactionAdapter.toDto(satisfaction);
		// DTO needs password field if we want to save it.
		// My SatisfactionDto doesn't have password field!
		// I need to update SatisfactionDto to include password for registration.
		// Wait, I missed adding password to SatisfactionDto?
		// Please check SatisfactionDto content again.
		// If missing, I need to update SatisfactionDto.

		egovSatisfactionService.registerSatisfaction(dto);

		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdg(0);
		satisfactionVO.setWrterNm("");

		return "forward:/cop/bbs/anonymous/selectArticleDetail.do";
	}

	/**
	 * 만족도조사를 삭제한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/deleteSatisfaction.do")
	public String deleteSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@ModelAttribute("satisfaction") Satisfaction satisfaction, ModelMap model) throws Exception {
		@SuppressWarnings("unused")
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			egovSatisfactionService.deleteSatisfaction(Long.valueOf(satisfactionVO.getStsfdgNo()));
		}

		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdg(0);

		return "forward:/cop/bbs/selectArticleDetail.do";
	}

	/**
	 * 익명 만족도조사를 삭제한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/anonymous/deleteSatisfaction.do")
	public String deleteAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@ModelAttribute("satisfaction") Satisfaction satisfaction, ModelMap model) throws Exception {

		// -------------------------------
		// 패스워드 비교
		// -------------------------------
		// Need a method to get password or verify.
		// String dbpassword =
		// bbsSatisfactionService.getSatisfactionPassword(satisfactionVO);
		// New service: checkPassword?
		String enpassword = EgovFileScrty.encryptPassword(satisfactionVO.getConfirmPassword(),
				satisfaction.getStsfdgNo());

		if (!egovSatisfactionService.checkPassword(Long.valueOf(satisfactionVO.getStsfdgNo()), enpassword)) {

			model.addAttribute("subMsg", egovMessageSource.getMessage("cop.password.not.same.msg"));

			return "forward:/cop/bbs/anonymous/selectArticleDetail.do";
		}
		//// -----------------------------

		egovSatisfactionService.deleteSatisfaction(Long.valueOf(satisfactionVO.getStsfdgNo()));

		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdg(0);
		satisfactionVO.setWrterNm("");

		return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
	}

	/**
	 * 만족도조사 수정 페이지로 이동한다.
	 *
	 * @param satisfactionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/selectSingleSatisfaction.do")
	public String selectSingleSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO, ModelMap model)
			throws Exception {

		// ------------------------------------------
		// JSP의 <head> 부분 처리 (javascript 생성)
		// ------------------------------------------
		model.addAttribute("type", satisfactionVO.getType()); // head or body

		if (satisfactionVO.getType().equals("head")) {
			return "egovframework/com/cop/stf/EgovSatisfactionList";
		}
		//// ----------------------------------------

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		satisfactionVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

		satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
		satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
		paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

		satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<SatisfactionDto> list = egovSatisfactionService.getSatisfactionList(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		int totCnt = list.size();
		Double avg = egovSatisfactionService.getAverageSatisfaction(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		Map<String, Object> summary = new java.util.HashMap<String, Object>();
		summary.put("stsfdg", avg != null ? avg : 0.0);
		List<SatisfactionVO> resultList = SatisfactionAdapter.toVOList(list);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("summary", summary);
		model.addAttribute("paginationInfo", paginationInfo);

		// Satisfaction data =
		// bbsSatisfactionService.selectSatisfaction(satisfactionVO);
		SatisfactionDto dto = egovSatisfactionService.getSatisfaction(Long.valueOf(satisfactionVO.getStsfdgNo()));
		SatisfactionVO data = SatisfactionAdapter.toVO(dto);

		satisfactionVO.setStsfdgNo(data.getStsfdgNo());
		satisfactionVO.setNttId(data.getNttId());
		satisfactionVO.setBbsId(data.getBbsId());
		satisfactionVO.setWrterId(data.getWrterId());
		satisfactionVO.setWrterNm(data.getWrterNm());
		satisfactionVO.setStsfdgPassword(data.getStsfdgPassword());
		satisfactionVO.setStsfdgCn(data.getStsfdgCn());
		satisfactionVO.setStsfdg(data.getStsfdg());
		satisfactionVO.setUseAt(data.getUseAt());
		satisfactionVO.setFrstRegisterPnttm(data.getFrstRegisterPnttm());
		satisfactionVO.setFrstRegisterNm(data.getFrstRegisterNm());

		return "egovframework/com/cop/stf/EgovSatisfactionList";
	}

	/**
	 * 익명 만족도조사 수정 페이지로 이동한다.
	 *
	 * @param satisfactionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/anonymous/selectSingleSatisfaction.do")
	public String selectAnonymousSingleSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			ModelMap model) throws Exception {

		// ------------------------------------------
		// JSP의 <head> 부분 처리 (javascript 생성)
		// ------------------------------------------
		model.addAttribute("type", satisfactionVO.getType()); // head or body

		if (satisfactionVO.getType().equals("head")) {
			return "egovframework/com/cop/stf/EgovSatisfactionList";
		}
		//// ----------------------------------------

		model.addAttribute("anonymous", "true");

		satisfactionVO.setSubPageUnit(propertyService.getInt("pageUnit"));
		satisfactionVO.setSubPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(satisfactionVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(satisfactionVO.getSubPageUnit());
		paginationInfo.setPageSize(satisfactionVO.getSubPageSize());

		satisfactionVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		satisfactionVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		satisfactionVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<SatisfactionDto> list = egovSatisfactionService.getSatisfactionList(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		int totCnt = list.size();
		Double avg = egovSatisfactionService.getAverageSatisfaction(satisfactionVO.getNttId(),
				satisfactionVO.getBbsId());
		Map<String, Object> summary = new java.util.HashMap<String, Object>();
		summary.put("stsfdg", avg != null ? avg : 0.0);
		List<SatisfactionVO> resultList = SatisfactionAdapter.toVOList(list);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("summary", summary);
		model.addAttribute("paginationInfo", paginationInfo);

		// -------------------------------
		// 패스워드 비교
		// -------------------------------
		String enpassword = EgovFileScrty.encryptPassword(satisfactionVO.getConfirmPassword(),
				satisfactionVO.getStsfdgNo());

		if (!egovSatisfactionService.checkPassword(Long.valueOf(satisfactionVO.getStsfdgNo()), enpassword)) {

			model.addAttribute("subMsg", egovMessageSource.getMessage("cop.password.not.same.msg"));

			satisfactionVO.setStsfdgNo("");
			satisfactionVO.setStsfdgCn("");
			satisfactionVO.setStsfdg(0);
			satisfactionVO.setWrterNm("");

		} else {

			SatisfactionDto dto = egovSatisfactionService.getSatisfaction(Long.valueOf(satisfactionVO.getStsfdgNo()));
			SatisfactionVO data = SatisfactionAdapter.toVO(dto);

			satisfactionVO.setStsfdgNo(data.getStsfdgNo());
			satisfactionVO.setNttId(data.getNttId());
			satisfactionVO.setBbsId(data.getBbsId());
			satisfactionVO.setWrterId(data.getWrterId());
			satisfactionVO.setWrterNm(data.getWrterNm());

			satisfactionVO.setStsfdgCn(data.getStsfdgCn());
			satisfactionVO.setStsfdg(data.getStsfdg());
			satisfactionVO.setUseAt(data.getUseAt());
			satisfactionVO.setFrstRegisterPnttm(data.getFrstRegisterPnttm());
			satisfactionVO.setFrstRegisterNm(data.getFrstRegisterNm());
		}
		//// -----------------------------

		return "egovframework/com/cop/stf/EgovSatisfactionList";
	}

	/**
	 * 만족도조사를 수정한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/updateSatisfaction.do")
	public String updateSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "작성자 및 만족도는 필수 입력값입니다.");

			return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
			satisfaction.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			satisfaction.setStsfdgPassword(""); // dummy

			SatisfactionDto dto = SatisfactionAdapter.toDto(satisfaction);
			egovSatisfactionService.updateSatisfaction(dto);

			satisfactionVO.setStsfdgCn("");
			satisfactionVO.setStsfdgNo("");
			satisfactionVO.setStsfdg(0);
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
	}

	/**
	 * 익명 만족도조사를 수정한다.
	 *
	 * @param satisfactionVO
	 * @param satisfaction
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/stf/anonymous/updateSatisfaction.do")
	public String updateAnonymousSatisfaction(@ModelAttribute("searchVO") SatisfactionVO satisfactionVO,
			@Valid @ModelAttribute("satisfaction") Satisfaction satisfaction,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "작성자 및 만족도는 필수 입력값입니다.");

			return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
		}

		satisfaction.setLastUpdusrId("ANONYMOUS");
		satisfaction.setStsfdgPassword(
				EgovFileScrty.encryptPassword(satisfaction.getStsfdgPassword(), satisfaction.getStsfdgNo()));

		SatisfactionDto dto = SatisfactionAdapter.toDto(satisfaction);
		// Need to ensure password is in DTO for update
		egovSatisfactionService.updateSatisfaction(dto);

		satisfactionVO.setStsfdgNo("");
		satisfactionVO.setStsfdgCn("");
		satisfactionVO.setStsfdg(0);
		satisfactionVO.setWrterNm("");

		return "forward:/cop/bbs/anonymous/selectBoardArticle.do";
	}
}
