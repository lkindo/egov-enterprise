package egovframework.com.sym.prm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.sym.prm.service.EgovProgrmManageService;
import egovframework.com.sym.prm.service.ProgrmManageDtlVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * ??? ?? ????? ???? ? ?????
 * 
 * @author ?? ?? ??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??           ????
 *   2011.08.22  ?????         selectProgrmChangRequstProcess() ????? trim ??
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2024.09.04  ??         ? ?????? ??? method ??? validation ?
 *   2025.07.21  ????         2025????????PMD???????? ????????-FormalParameterNamingConventions(?????????
 *   2025.07.21  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
// @Controller
public class EgovProgrmManageController {

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovProgrmManageService **/
	@Resource(name = "progrmManageService")
	private EgovProgrmManageService progrmManageService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovSndngMailRegistService **/
	@Resource(name = "sndngMailRegistService")
	private EgovSndngMailRegistService sndngMailRegistService;

	/**
	 * ??????? ? ?????.
	 * 
	 * @param progrmFileNm String
	 * @return ????? "sym prm/EgovProgramListDetailSelectUpdt"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListDetailSelect.do")
	public String selectProgrm(@RequestParam("tmp_progrmNm") String progrmFileNm,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		ProgrmManageVO vo = new ProgrmManageVO();
		vo.setProgrmFileNm(progrmFileNm);
		ProgrmManageVO progrmManageVO = progrmManageService.selectProgrm(vo);
		model.addAttribute("progrmManageVO", progrmManageVO);
		return "egovframework/com/sym/prm/EgovProgramListDetailSelectUpdt";
	}

	/**
	 * ??? ??????
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovProgramListManage"   
	 * @exception Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/prm/EgovProgramListManageSelect.do")
	public String selectProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProgrmManageVO> resultList = progrmManageService.selectProgrmList(searchVO);
		model.addAttribute("list_progrmmanage", resultList);

		int totCnt = progrmManageService.selectProgrmListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovProgramListManage";
	}

	/**
	 * ??? ???????.
	 * 
	 * @param checkedProgrmFileNmForDel String
	 * @return ????? "forward: sym/prm/EgovProgramListManageSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping("/sym/prm/EgovProgrmManageListDelete.do")
	public String deleteProgrmManageList(@RequestParam("checkedProgrmFileNmForDel") String checkedProgrmFileNmForDel,
			@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String[] delProgrmFileNm = checkedProgrmFileNmForDel.split(",");
		if (delProgrmFileNm == null || (delProgrmFileNm.length == 0)) {
			resultMsg = egovMessageSource.getMessage("fail.common.delete");
			sLocationUrl = "forward:/sym/prm/EgovProgramListManageSelect.do";
		} else {
			progrmManageService.deleteProgrmManageList(checkedProgrmFileNmForDel);
			resultMsg = egovMessageSource.getMessage("success.common.delete");
			sLocationUrl = "forward:/sym/prm/EgovProgramListManageSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		// status.setComplete();
		return sLocationUrl;
	}

	/**
	 * ??? ??
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return ????? ?? ???"sym prm/EgovProgramListRegist", ?      ???              ?          ?                  ???   
	 *         "forward:/sym/prm/EgovProgramListManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListRegistView.do")
	public String insertProgrmListView(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		return "egovframework/com/sym/prm/EgovProgramListRegist";
	}

	/**
	 * ????????.
	 * 
	 * @param progrmManageVO
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping(value = "/sym/prm/EgovProgramListRegist.do")
	public String insertProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/prm/EgovProgramListRegist";
		}
		if (progrmManageVO.getProgrmDc() == null || progrmManageVO.getProgrmDc().equals("")) {
			progrmManageVO.setProgrmDc(" ");
		}
		progrmManageService.insertProgrm(progrmManageVO);
		resultMsg = egovMessageSource.getMessage("success.common.insert");
		model.addAttribute("resultMsg", resultMsg);
		return "redirect:/sym/prm/EgovProgramListManageSelect.do";
	}

	/**
	 * ??????? ??.
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return ????? "forward: sym/prm/EgovProgramListManageSelect.do"   
	 * @exception Exception
	 */
	/* ????? */
	@RequestMapping(value = "/sym/prm/EgovProgramListDetailSelectUpdt.do")
	public String updateProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String resultMsg = "";
		String sLocationUrl = null;
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/prm/EgovProgramListDetailSelect.do";
			return sLocationUrl;
		}
		if (progrmManageVO.getProgrmDc() == null || progrmManageVO.getProgrmDc().equals("")) {
			progrmManageVO.setProgrmDc(" ");
		}
		progrmManageService.updateProgrm(progrmManageVO);
		resultMsg = egovMessageSource.getMessage("success.common.update");
		sLocationUrl = "forward:/sym/prm/EgovProgramListManageSelect.do";
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * ???????????.
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return ????? "forward: sym/prm/EgovProgramListManageSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListManageDelete.do")
	public String deleteProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		progrmManageService.deleteProgrm(progrmManageVO);
		resultMsg = egovMessageSource.getMessage("success.common.delete");
		model.addAttribute("resultMsg", resultMsg);
		return "forward:/sym/prm/EgovProgramListManageSelect.do";
	}

	/**
	 * ??????????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovProgramChangeRequst"   
	 * @exception Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/prm/EgovProgramChangeRequstSelect.do")
	public String selectProgrmChangeRequstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProgrmManageDtlVO> resultList = progrmManageService.selectProgrmChangeRequstList(searchVO);
		model.addAttribute("list_changerequst", resultList);

		int totCnt = progrmManageService.selectProgrmChangeRequstListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovProgramChangeRequst";
	}

	/**
	 * ??????? ????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ????? "sym prm/EgovProgramChangRequstDetailSelectUpdt"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelect.do")
	public String selectProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		if (progrmManageDtlVO.getProgrmFileNm() == null || progrmManageDtlVO.getProgrmFileNm().equals("")) {
			progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());
			int tmpNo = progrmManageDtlVO.getTmpRqesterNo();
			progrmManageDtlVO.setRqesterNo(tmpNo);
		}
		ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);
		model.addAttribute("progrmManageDtlVO", resultVO);
		return "egovframework/com/sym/prm/EgovProgramChangRequstDetailSelectUpdt";
	}

	/**
	 * ????????????????????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @param commandMap        Map
	 * @return ????? ?? ???"sym prm/EgovProgramChangRequstStre", ?      ???              ?          ?                  ???   
	 *         "forward:/sym/prm/EgovProgramChangeRequstSelect.do"
	 * @exception Exception
	 */
	/* ??????*/
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstStre.do")
	public String insertProgrmChangeRequst(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?????
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = null;
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("insert")) {
			// beanValidator ??
			if (bindingResult.hasErrors()) {
				sLocationUrl = "egovframework/com/sym/prm/EgovProgramChangRequstStre";
				return sLocationUrl;
			}
			if (progrmManageDtlVO.getChangerqesterCn() == null || progrmManageDtlVO.getChangerqesterCn().equals("")) {
				progrmManageDtlVO.setChangerqesterCn("");
			}
			if (progrmManageDtlVO.getRqesterProcessCn() == null || progrmManageDtlVO.getRqesterProcessCn().equals("")) {
				progrmManageDtlVO.setRqesterProcessCn("");
			}
			progrmManageService.insertProgrmChangeRequst(progrmManageDtlVO);
			resultMsg = egovMessageSource.getMessage("success.common.insert");
			sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";
		} else {
			/* MAX?????*/
			ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequstNo(progrmManageDtlVO);
			progrmManageDtlVO.setRqesterNo(resultVO.getRqesterNo());
			progrmManageDtlVO.setRqesterPersonId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			sLocationUrl = "egovframework/com/sym/prm/EgovProgramChangRequstStre";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * ????????? ??.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ????? "forward: sym/prm/EgovProgramChangeRequstSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelectUpdt.do")
	public String updateProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// beanValidator ??
		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
			return sLocationUrl;
		}

		// KISA ?? ??(2018-10-29, ????
		if (EgovStringUtil.isNullToString(progrmManageDtlVO.getRqesterPersonId())
				.equals(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()))) {
			if (progrmManageDtlVO.getChangerqesterCn() == null || progrmManageDtlVO.getChangerqesterCn().equals("")) {
				progrmManageDtlVO.setChangerqesterCn(" ");
			}
			if (progrmManageDtlVO.getRqesterProcessCn() == null || progrmManageDtlVO.getRqesterProcessCn().equals("")) {
				progrmManageDtlVO.setRqesterProcessCn(" ");
			}
			progrmManageService.updateProgrmChangeRequst(progrmManageDtlVO);
			resultMsg = egovMessageSource.getMessage("success.common.update");
			sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";
		} else {
			resultMsg = "??      ????      ?????     ??                  ?      ???      ??                  ?      ??      ???              ?        ??      .";
			progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());
			progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * ?????????????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ????? "forward: sym/prm/EgovProgramChangeRequstSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDelete.do")
	public String deleteProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA ?? ??(2018-10-29, ????
		if (EgovStringUtil.isNullToString(progrmManageDtlVO.getRqesterPersonId())
				.equals(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getId()))) {
			// progrmManageDtlVO.setRqesterPersonId(user.getId());
			model.addAttribute("resultMsg", egovMessageSource.getMessage("success.common.delete"));
			progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);
			sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";
		} else {
			model.addAttribute("resultMsg",
					egovMessageSource.getMessage("comSymPrm.progrmManageController.checkRqesterPersonId")); // ?????
																											// ?????????
																											// ????
																											// ???????.
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
		}
		return sLocationUrl;
	}

	/**
	 * ????????????????????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovProgramChangeRequstProcess"   
	 * @exception Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/prm/EgovProgramChangeRequstProcessListSelect.do")
	public String selectProgrmChangeRequstProcessList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<?> resultList = progrmManageService.selectChangeRequstProcessList(searchVO);
		model.addAttribute("list_changerequst", resultList);

		int totCnt = progrmManageService.selectChangeRequstProcessListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovProgramChangeRequstProcess";
	}

	/**
	 * ?????????????????????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ????? "sym prm/EgovProgramChangRequstProcessDetailSelectUpdt"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelect.do")
	public String selectProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		if (progrmManageDtlVO.getProgrmFileNm() == null) {
			progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());
			progrmManageDtlVO.setRqesterNo(progrmManageDtlVO.getTmpRqesterNo());
		}
		ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);
		if (resultVO.getProcessDe() != null) {
			resultVO.setProcessDe(resultVO.getProcessDe().trim());// 2011.08.22
		}

		if (resultVO.getOpetrId() == null) {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			resultVO.setOpetrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		}
		model.addAttribute("progrmManageDtlVO", resultVO);
		return "egovframework/com/sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt";
	}

	/**
	 * ???????????? ??.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ?????
	 *         "forward: sym/prm/EgovProgramChangeRequstProcessListSelect.do"   
	 * @exception Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt.do")
	public String updateProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		boolean result = true;
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstProcessDetailSelect.do";
			return sLocationUrl;
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// KISA ?? ??(2018-10-29, ????
		if (progrmManageDtlVO.getOpetrId() != null) {
			if (progrmManageDtlVO.getOpetrId()
					.equals(user == null ? "" : EgovStringUtil.isNullToString(user.getId()))) {
				if (progrmManageDtlVO.getChangerqesterCn() == null
						|| progrmManageDtlVO.getChangerqesterCn().equals("")) {
					progrmManageDtlVO.setChangerqesterCn(" ");
				}
				if (progrmManageDtlVO.getRqesterProcessCn() == null
						|| progrmManageDtlVO.getRqesterProcessCn().equals("")) {
					progrmManageDtlVO.setRqesterProcessCn(" ");
				}
				progrmManageService.updateProgrmChangeRequstProcess(progrmManageDtlVO);
				model.addAttribute("resultMsg", egovMessageSource.getMessage("success.common.update"));

				ProgrmManageDtlVO vo = new ProgrmManageDtlVO();
				vo = progrmManageService.selectRqesterEmail(progrmManageDtlVO);
				String sTemp = null;
				// KISA ?? ??(2018-10-29, ????
				if ("A".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusA"); // ??
				} else if ("P".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusP"); // ?
				} else if ("R".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusR"); // ??
				} else if ("C".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusC"); // ??
				}
				// ????????????? ???.(???????)
				SndngMailVO sndngMailVO = new SndngMailVO();
				sndngMailVO.setDsptchPerson(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
				sndngMailVO.setRecptnPerson(vo.getTmpEmail());
				sndngMailVO.setSj(egovMessageSource.getMessage("comSymPrm.progrmManageController.email.Sj")); // ?????
																												// ??
				sndngMailVO.setEmailCn(
						egovMessageSource.getMessage("comSymPrm.progrmManageController.email.emailCn") + " : " + sTemp); // ???
																															// ??
																															// ????
																															// ??
																															// ???????
				sndngMailVO.setAtchFileId(null);
				result = sndngMailRegistService.insertSndngMail(sndngMailVO);
				sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";
			} else {
				model.addAttribute("resultMsg", egovMessageSource
						.getMessage("comSymPrm.progrmManageController.updateProgrmChangRequstProcess.fail")); // ????
																												// ?????????
																												// ???
																												// ????
																												// ???
																												// ?????
																												// ?????.
				progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());
				progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());
				sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstProcessDetailSelect.do";
			}
		}
		return sLocationUrl;
	}

	/**
	 * ??????? ??????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ?????
	 *         "forward: sym/prm/EgovProgramChangeRequstProcessListSelect.do"   
	 * @exception Exception
	 */
	/* ??????????*/
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDelete.do")
	public String deleteProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);

		return "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";
	}

	/**
	 * ?????????????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovProgramChgHst"   
	 * @exception Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/prm/EgovProgramChgHstListSelect.do")
	public String selectProgrmChgHstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProgrmManageDtlVO> resultList = progrmManageService.selectProgrmChangeRequstList(searchVO);
		model.addAttribute("list_changerequst", resultList);

		int totCnt = progrmManageService.selectProgrmChangeRequstListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovProgramChgHst";
	}

	/* ????????*/
	/**
	 * ???????????.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return ????? "sym prm/EgovProgramChgHstDetail"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChgHstListDetailSelect.do")
	public String selectProgramChgHstListDetail(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());
		progrmManageDtlVO.setRqesterNo(progrmManageDtlVO.getTmpRqesterNo());

		ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);
		model.addAttribute("resultVO", resultVO);
		return "egovframework/com/sym/prm/EgovProgramChgHstDetail";
	}

	/**
	 * ??????????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovFileNmSearch"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListSearch.do")
	public String selectProgrmListSearch(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProgrmManageVO> resultList = progrmManageService.selectProgrmList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = progrmManageService.selectProgrmListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovFileNmSearch";
	}

	/**
	 * ??????????. (New)
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym prm/EgovFileNmSearch"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListSearchNew.do")
	public String selectProgrmListSearchNew(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<ProgrmManageVO> resultList = progrmManageService.selectProgrmList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = progrmManageService.selectProgrmListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/prm/EgovFileNmSearchNew";
	}
}
