package egovframework.com.sym.prm.web;

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
import jakarta.validation.Valid;

/**
 * ?꾨줈洹몃옩紐⑸줉 愿由щ컦 蹂寃쎌쓣 泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2011.08.22  ?쒖???         selectProgrmChangRequstProcess() 硫붿꽌??泥섎━?쇱옄 trim 泥섎━
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2024.09.04  沅뚰깭??         ?깅줉 ?붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━, validation ?곸슜
 *   2025.07.21  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *   2025.07.21  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovProgrmManageController {

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovProgrmManageService */
	@Resource(name = "progrmManageService")
	private EgovProgrmManageService progrmManageService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovSndngMailRegistService */
	@Resource(name = "sndngMailRegistService")
	private EgovSndngMailRegistService sndngMailRegistService;

	/**
	 * ?꾨줈洹몃옩紐⑸줉???곸꽭?붾㈃ ?몄텧 諛??곸꽭議고쉶?쒕떎.
	 * 
	 * @param progrmFileNm String
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramListDetailSelectUpdt"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListDetailSelect.do")
	public String selectProgrm(@RequestParam("tmp_progrmNm") String progrmFileNm,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩紐⑸줉 由ъ뒪?몄“?뚰븳??
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramListManage"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?꾨줈洹몃옩愿由?, order = 1111, gid = 60)
	@RequestMapping(value = "/sym/prm/EgovProgramListManageSelect.do")
	public String selectProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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

		return "egovframework/com/sym/prm/EgovProgramListManage";
	}

	/**
	 * ?꾨줈洹몃옩紐⑸줉 硫????젣?쒕떎.
	 * 
	 * @param checkedProgrmFileNmForDel String
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/prm/EgovProgramListManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping("/sym/prm/EgovProgrmManageListDelete.do")
	public String deleteProgrmManageList(@RequestParam("checkedProgrmFileNmForDel") String checkedProgrmFileNmForDel,
			@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩紐⑸줉 ?깅줉?붾㈃
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉?붾㈃ ?몄텧??"sym/prm/EgovProgramListRegist", 異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??
	 *         "forward:/sym/prm/EgovProgramListManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListRegistView.do")
	public String insertProgrmListView(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		return "egovframework/com/sym/prm/EgovProgramListRegist";
	}

	/**
	 * ?꾨줈洹몃옩紐⑸줉???깅줉?쒕떎.
	 * 
	 * @param progrmManageVO
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListRegist.do")
	public String insertProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩紐⑸줉???섏젙 ?쒕떎.
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/prm/EgovProgramListManageSelect.do"
	 * @exception Exception
	 */
	/* ?꾨줈洹몃옩紐⑸줉?섏젙 */
	@RequestMapping(value = "/sym/prm/EgovProgramListDetailSelectUpdt.do")
	public String updateProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String resultMsg = "";
		String sLocationUrl = null;
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩紐⑸줉????젣 ?쒕떎.
	 * 
	 * @param progrmManageVO ProgrmManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/prm/EgovProgramListManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListManageDelete.do")
	public String deleteProgrmList(@ModelAttribute("progrmManageVO") ProgrmManageVO progrmManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?ぉ濡?議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChangeRequst"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?꾨줈洹몃옩蹂寃쎌슂泥??由?, order = 1112, gid = 60)
	@RequestMapping(value = "/sym/prm/EgovProgramChangeRequstSelect.do")
	public String selectProgrmChangeRequstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?ぉ濡앹쓣 ?곸꽭議고쉶?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChangRequstDetailSelectUpdt"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelect.do")
	public String selectProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??붾㈃???몄텧諛??꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?깅줉?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @param commandMap        Map
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉?붾㈃ ?몄텧??"sym/prm/EgovProgramChangRequstStre", 異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??
	 *         "forward:/sym/prm/EgovProgramChangeRequstSelect.do"
	 * @exception Exception
	 */
	/* ?꾨줈洹몃옩蹂寃쎌슂泥?벑濡?*/
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstStre.do")
	public String insertProgrmChangeRequst(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = null;
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("insert")) {
			// beanValidator 泥섎━
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
			/* MAX?붿껌踰덊샇 議고쉶 */
			ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequstNo(progrmManageDtlVO);
			progrmManageDtlVO.setRqesterNo(resultVO.getRqesterNo());
			progrmManageDtlVO.setRqesterPersonId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			sLocationUrl = "egovframework/com/sym/prm/EgovProgramChangRequstStre";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * ?꾨줈洹몃옩蹂寃??붿껌???섏젙 ?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/prm/EgovProgramChangeRequstSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelectUpdt.do")
	public String updateProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// beanValidator 泥섎━
		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
			return sLocationUrl;
		}

		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
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
			resultMsg = "?섏젙???ㅽ뙣?섏??듬땲?? 蹂寃쎌슂泥??섏젙? 蹂寃쎌슂泥?옄留??섏젙媛?ν빀?덈떎.";
			progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());
			progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * ?꾨줈洹몃옩蹂寃??붿껌????젣 ?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/prm/EgovProgramChangeRequstSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstDelete.do")
	public String deleteProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if (EgovStringUtil.isNullToString(progrmManageDtlVO.getRqesterPersonId())
				.equals(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getId()))) {
			// progrmManageDtlVO.setRqesterPersonId(user.getId());
			model.addAttribute("resultMsg", egovMessageSource.getMessage("success.common.delete"));
			progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);
			sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";
		} else {
			model.addAttribute("resultMsg",
					egovMessageSource.getMessage("comSymPrm.progrmManageController.checkRqesterPersonId")); // ??젣??
																											// ?ㅽ뙣?섏??듬땲??
																											// 蹂寃쎌슂泥?옄留?
																											// ??젣媛?ν빀?덈떎.
			sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";
		}
		return sLocationUrl;
	}

	/**
	 * ?꾨줈洹몃옩蹂寃??붿껌?????泥섎━ ?ы빆??議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChangeRequstProcess"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?꾨줈洹몃옩蹂寃쎌슂泥?쿂由?, order = 1113, gid = 60)
	@RequestMapping(value = "/sym/prm/EgovProgramChangeRequstProcessListSelect.do")
	public String selectProgrmChangeRequstProcessList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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
	 * ?꾨줈洹몃옩蹂寃??붿껌?????泥섎━ ?ы빆???곸꽭議고쉶?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelect.do")
	public String selectProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由??댁슜???섏젙 ?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫
	 *         "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do"
	 * @exception Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt.do")
	public String updateProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		boolean result = true;
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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

		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
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
				// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				if ("A".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusA"); // ?좎껌以?
				} else if ("P".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusP"); // 吏꾪뻾以?
				} else if ("R".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusR"); // 諛섎젮
				} else if ("C".equals(progrmManageDtlVO.getProcessSttus())) {
					sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusC"); // 泥섎━?꾨즺
				}
				// ?꾨줈洹몃옩 蹂寃쎌슂泥??ы빆???대찓?쇰줈 諛쒖넚?쒕떎.(硫붿씪?곕룞?붾（???쒖슜)
				SndngMailVO sndngMailVO = new SndngMailVO();
				sndngMailVO.setDsptchPerson(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
				sndngMailVO.setRecptnPerson(vo.getTmpEmail());
				sndngMailVO.setSj(egovMessageSource.getMessage("comSymPrm.progrmManageController.email.Sj")); // ?꾨줈洹몃옩蹂寃쎌슂泥?
																												// 泥섎━.
				sndngMailVO.setEmailCn(
						egovMessageSource.getMessage("comSymPrm.progrmManageController.email.emailCn") + " : " + sTemp); // ?꾨줈洹몃옩
																															// 蹂寃쎌슂泥?
																															// ?ы빆??
																															// 泥섎━
																															// ?섏뿀?듬땲??
				sndngMailVO.setAtchFileId(null);
				result = sndngMailRegistService.insertSndngMail(sndngMailVO);
				sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";
			} else {
				model.addAttribute("resultMsg", egovMessageSource
						.getMessage("comSymPrm.progrmManageController.updateProgrmChangRequstProcess.fail")); // ?섏젙??
																												// ?ㅽ뙣?섏??듬땲??
																												// 蹂寃쎌슂泥?쿂由?
																												// ?섏젙?
																												// 蹂寃쎌쿂由ы빐??
																												// ?대떦?먮쭔
																												// 泥섎━媛?ν빀?덈떎.
				progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());
				progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());
				sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstProcessDetailSelect.do";
			}
		}
		return sLocationUrl;
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由щ? ??젣 ?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫
	 *         "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do"
	 * @exception Exception
	 */
	/* ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由???젣 */
	@RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDelete.do")
	public String deleteProgrmChangRequstProcess(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);

		return "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌씠?λ━?ㅽ듃瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChgHst"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?꾨줈洹몃옩蹂寃쎌씠??, order = 1114, gid = 60)
	@RequestMapping(value = "/sym/prm/EgovProgramChgHstListSelect.do")
	public String selectProgrmChgHstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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

	/* ?꾨줈洹몃옩蹂寃쎌씠?μ긽?몄“??*/
	/**
	 * ?꾨줈洹몃옩蹂寃쎌씠?μ쓣 ?곸꽭議고쉶?쒕떎.
	 * 
	 * @param progrmManageDtlVO ProgrmManageDtlVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovProgramChgHstDetail"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramChgHstListDetailSelect.do")
	public String selectProgramChgHstListDetail(
			@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
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
	 * ?꾨줈洹몃옩?뚯씪紐낆쓣 議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovFileNmSearch"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListSearch.do")
	public String selectProgrmListSearch(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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
	 * ?꾨줈洹몃옩?뚯씪紐낆쓣 議고쉶?쒕떎. (New)
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/prm/EgovFileNmSearch"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/prm/EgovProgramListSearchNew.do")
	public String selectProgrmListSearchNew(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
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