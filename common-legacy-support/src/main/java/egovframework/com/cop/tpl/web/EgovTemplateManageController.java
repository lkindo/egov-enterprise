package egovframework.com.cop.tpl.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.tpl.service.EgovTemplateManageService;
import egovframework.com.cop.tpl.service.TemplateInf;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??????? ? ??? ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------        --------    ---------------------------
 *   2009.03.18  ????         ????
 *   2011.08.26	 ???		IncludedInfo annotation ??
 *
 *      </pre>
 **/
@Controller
public class EgovTemplateManageController {

	@Resource(name = "EgovTemplateManageService")
	private EgovTemplateManageService tmplatService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	// Logger log = Logger.getLogger(this.getClass());

	/**
	 * ?????????.
	 *
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@IncludedInfo(name = "Legacy Controller", order = 200, gid = 40)
	@RequestMapping("/cop/tpl/selectTemplateInfs.do")
	public String selectTemplateInfs(@ModelAttribute("searchVO") TemplateInfVO tmplatInfVO, ModelMap model)
			throws Exception {
		tmplatInfVO.setPageUnit(propertyService.getInt("pageUnit"));
		tmplatInfVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(tmplatInfVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(tmplatInfVO.getPageUnit());
		paginationInfo.setPageSize(tmplatInfVO.getPageSize());

		tmplatInfVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		tmplatInfVO.setLastIndex(paginationInfo.getLastRecordIndex());
		tmplatInfVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = tmplatService.selectTemplateInfs(tmplatInfVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/tpl/EgovTemplateList";
	}

	/**
	 * ???????????????.
	 *
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/tpl/selectTemplateInf.do")
	public String selectTemplateInf(@ModelAttribute("searchVO") TemplateInfVO tmplatInfVO, ModelMap model)
			throws Exception {

		ComDefaultCodeVO codeVO = new ComDefaultCodeVO();

		codeVO.setCodeId("COM005");
		List<CmmnDetailCode> result = cmmUseService.selectCmmCodeDetail(codeVO);

		TemplateInfVO vo = tmplatService.selectTemplateInf(tmplatInfVO);

		model.addAttribute("TemplateInfVO", vo);
		model.addAttribute("resultList", result);

		return "egovframework/com/cop/tpl/EgovTemplateUpdt";
	}

	/**
	 * ??????????.
	 *
	 * @param searchVO
	 * @param tmplatInfo
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/tpl/insertTemplateInf.do")
	public String insertTemplateInf(@ModelAttribute("searchVO") TemplateInfVO searchVO,
			@Valid @ModelAttribute("templateInf") TemplateInf templateInf, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			ComDefaultCodeVO vo = new ComDefaultCodeVO();

			vo.setCodeId("COM005");

			List<CmmnDetailCode> result = cmmUseService.selectCmmCodeDetail(vo);

			model.addAttribute("resultList", result);

			return "egovframework/com/cop/tpl/EgovTemplateRegist";
		}

		if (isAuthenticated) {
			templateInf.setFrstRegisterId(user.getUniqId());
			tmplatService.insertTemplateInf(templateInf);
		}

		return "forward:/cop/tpl/selectTemplateInfs.do";
	}

	/**
	 * ???????? ????????.
	 *
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/tpl/addTemplateInf.do")
	public String addTemplateInf(@ModelAttribute("searchVO") TemplateInfVO searchVO, ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();

		vo.setCodeId("COM005");

		List<CmmnDetailCode> result = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("resultList", result);

		return "egovframework/com/cop/tpl/EgovTemplateRegist";
	}

	/**
	 * ???????????.
	 *
	 * @param searchVO
	 * @param tmplatInfo
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/tpl/updateTemplateInf.do")
	public String updateTemplateInf(@ModelAttribute("searchVO") TemplateInfVO tmplatInfVO,
			@Valid @ModelAttribute("templateInf") TemplateInf templateInf, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();

			codeVO.setCodeId("COM005");

			List<CmmnDetailCode> result = cmmUseService.selectCmmCodeDetail(codeVO);

			TemplateInfVO vo = tmplatService.selectTemplateInf(tmplatInfVO);

			model.addAttribute("TemplateInfVO", vo);
			model.addAttribute("resultList", result);

			return "egovframework/com/cop/tpl/EgovTemplateUpdt";
		}

		if (isAuthenticated) {
			templateInf.setLastUpdusrId(user.getUniqId());
			tmplatService.updateTemplateInf(templateInf);
		}

		return "forward:/cop/tpl/selectTemplateInfs.do";
	}

	/**
	 * ????????????.
	 *
	 * @param searchVO
	 * @param tmplatInfo
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/bbs/deleteTemplateInf.do")
	public String deleteTemplateInf(@ModelAttribute("searchVO") TemplateInfVO searchVO,
			@ModelAttribute("tmplatInf") TemplateInf tmplatInf, SessionStatus status, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			tmplatInf.setLastUpdusrId(user.getUniqId());
			tmplatService.deleteTemplateInf(tmplatInf);
		}

		return "forward:/cop/tpl/selectTemplateInfs.do";
	}

	/**
	 * ????? ?????????.
	 *
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/tpl/selectTemplateInfsPop.do")
	public String selectTemplateInfsPop(@ModelAttribute("searchVO") TemplateInfVO tmplatInfVO,
			@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		String typeFlag = (String) commandMap.get("typeFlag");

		if ("CLB".equals(typeFlag)) {
			tmplatInfVO.setTypeFlag(typeFlag);
			tmplatInfVO.setTmplatSeCode("TMPT03");
		} else if ("CMY".equals(typeFlag)) {
			tmplatInfVO.setTypeFlag(typeFlag);
			tmplatInfVO.setTmplatSeCode("TMPT02");
		} else {
			tmplatInfVO.setTypeFlag(typeFlag);
			tmplatInfVO.setTmplatSeCode("TMPT01");
		}

		tmplatInfVO.setPageUnit(propertyService.getInt("pageUnit"));
		tmplatInfVO.setPageSize(propertyService.getInt("pageSize"));
		// CMY, CLB

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(tmplatInfVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(tmplatInfVO.getPageUnit());
		paginationInfo.setPageSize(tmplatInfVO.getPageSize());

		tmplatInfVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		tmplatInfVO.setLastIndex(paginationInfo.getLastRecordIndex());
		tmplatInfVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = tmplatService.selectTemplateInfs(tmplatInfVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("typeFlag", typeFlag);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/tpl/EgovTemplateInqirePopup";
	}
}
