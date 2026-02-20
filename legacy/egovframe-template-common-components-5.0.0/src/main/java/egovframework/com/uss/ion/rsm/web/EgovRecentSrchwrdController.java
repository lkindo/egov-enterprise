package egovframework.com.uss.ion.rsm.web;

import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.Writer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.rsm.service.EgovRecentSrchwrdService;
import egovframework.com.uss.ion.rsm.service.RecentSrchwrd;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import net.sourceforge.ajaxtags.xml.AjaxXmlBuilder;

/**
 * 理쒓렐寃?됱뼱瑜?泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.12.15  ?닿린??         寃?됱뼱 ?놁쓣 ??誘몄??? ?ъ슜??寃?됱뿬遺 'N'?????먮룞寃??誘몄궗???섏젙
 *   2020.10.29  沅뚰깭??         ?깅줉 ?붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━
 *   2025.08.13  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *   2025.08.13  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
@Controller
public class EgovRecentSrchwrdController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovRecentSrchwrdController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovRecentSrchwrdService */
	@Resource(name = "egovRecentSrchwrdService")
	private EgovRecentSrchwrdService egovRecentSrchwrdService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * 理쒓렐寃?됱뼱愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param recentSrchwrdVO
	 * @param model
	 * @return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdList"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@IncludedInfo(name = "理쒓렐寃?됱뼱 議고쉶", order = 760, gid = 50)
	@RequestMapping(value = "/uss/ion/rsm/listRecentSrchwrd.do")
	public String egovRecentSrchwrdList(@ModelAttribute("searchVO") RecentSrchwrd searchVO,
			@RequestParam Map<?, ?> commandMap, RecentSrchwrd recentSrchwrdVO, ModelMap model) throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

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

		List<EgovMap> reusltList = egovRecentSrchwrdService.selectRecentSrchwrdList(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovRecentSrchwrdService.selectRecentSrchwrdListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdList";
	}

	/**
	 * 理쒓렐寃?됱뼱愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param recentSrchwrdVO
	 * @param commandMap
	 * @param model
	 * @return "govframework/com/uss/ion/rsm/EgovRecentSrchwrdDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/detailRecentSrchwrd.do")
	public String egovRecentSrchwrdDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			RecentSrchwrd recentSrchwrd, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovRecentSrchwrdService.deleteRecentSrchwrd(recentSrchwrd);
			sLocationUrl = "redirect:/uss/ion/rsm/listRecentSrchwrd.do";
		} else {
			RecentSrchwrd recentSrchwrdVO = egovRecentSrchwrdService.selectRecentSrchwrdDetail(recentSrchwrd);
			model.addAttribute("recentSrchwrd", recentSrchwrdVO);
		}

		return sLocationUrl;
	}

	/**
	 * 理쒓렐寃?됱뼱愿由??섏젙?붾㈃
	 * 
	 * @param searchVO
	 * @param recentSrchwrdVO
	 * @param model
	 * @return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/updtRecentSrchwrdView.do")
	public String egovRecentSrchwrdModify(RecentSrchwrd recentSrchwrd, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		RecentSrchwrd recentSrchwrdVO = egovRecentSrchwrdService.selectRecentSrchwrdDetail(recentSrchwrd);
		model.addAttribute("recentSrchwrd", recentSrchwrdVO);

		return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdUpdt";
	}

	/**
	 * 理쒓렐寃?됱뼱愿由щ? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param recentSrchwrdVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/ion/rsm/listRecentSrchwrd.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/updtRecentSrchwrd.do")
	public String egovRecentSrchwrdModify(RecentSrchwrd recentSrchwrd, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdUpdt";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		recentSrchwrd.setFrstRegisterId(uniqId);
		recentSrchwrd.setLastUpdusrId(uniqId);

		// ???
		egovRecentSrchwrdService.updateRecentSrchwrd(recentSrchwrd);

		return "redirect:/uss/ion/rsm/listRecentSrchwrd.do";
	}

	/**
	 * 理쒓렐寃?됱뼱愿由??깅줉 ?붾㈃
	 * 
	 * @param searchVO
	 * @param recentSrchwrdVO
	 * @param model
	 * @return "/uss/ion/rsm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/registRecentSrchwrdView.do")
	public String egovRecentSrchwrdRegist(@ModelAttribute("recentSrchwrd") RecentSrchwrd recentSrchwrd, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdRegist";
	}

	/**
	 * 理쒓렐寃?됱뼱愿由щ? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param recentSrchwrdVO
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/ion/rsm/listRecentSrchwrd.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/registRecentSrchwrd.do")
	public String egovRecentSrchwrdRegist(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("recentSrchwrd") RecentSrchwrd recentSrchwrd, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdRegist";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		recentSrchwrd.setFrstRegisterId(uniqId);
		recentSrchwrd.setLastUpdusrId(uniqId);

		// ???
		egovRecentSrchwrdService.insertRecentSrchwrd(recentSrchwrd);

		return "redirect:/uss/ion/rsm/listRecentSrchwrd.do";
	}

	/**
	 * 理쒓렐寃?됱뼱寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param recentSrchwrdVO
	 * @param model
	 * @return "egovframework/com/uss/ion/rsm/EgovOnlinePollList"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/rsm/listRecentSrchwrdResult.do")
	public String egovRecentSrchwrdResultList(@ModelAttribute("searchVO") RecentSrchwrd searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

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

		// 嫄대퀎??젣
		if (sCmd.equals("del")) {
			egovRecentSrchwrdService.deleteRecentSrchwrdResult(searchVO);
			// 愿由щ퀎??젣
		} else if (sCmd.equals("delAll")) {
			egovRecentSrchwrdService.deleteRecentSrchwrdResultAll(searchVO);
		}

		List<?> reusltList = egovRecentSrchwrdService.selectRecentSrchwrdResultList(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		model.addAttribute("srchwrdManageId",
				commandMap.get("srchwrdManageId") == null ? "" : (String) commandMap.get("srchwrdManageId"));

		int totCnt = egovRecentSrchwrdService.selectRecentSrchwrdResultListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/rsm/EgovRecentSrchwrdResultList";
	}

	/**
	 * 理쒓렐寃?됱뼱 寃곌낵瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "model"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/listRecentSrchwrdResultSerach.do")
	protected ModelAndView egovRecentSrchwrdResultSerachList(@RequestParam("searchKeyword") String searchKeyword,
			RecentSrchwrd recentSrchwrd) throws Exception {

		recentSrchwrd.setQ(searchKeyword);
		LOGGER.debug("recentSrchwrd : {}", recentSrchwrd);

		ModelAndView model = new ModelAndView(new AjaxXmlView());

		RecentSrchwrd recentSrchwrdVO = egovRecentSrchwrdService.selectRecentSrchwrdDetail(recentSrchwrd);

		List<EgovMap> reusltList = null;

		// ?ъ슜?먭??됱뿬遺 'Y'??寃쎌슦留?寃?됱뼱 議고쉶
		if (recentSrchwrdVO.getSrchwrdManageUseYn().equals("Y")) {
			reusltList = egovRecentSrchwrdService.selectRecentSrchwrdResultInquire(recentSrchwrd);
		} else { // 2012.11 KISA 蹂댁븞議곗튂
			reusltList = new ArrayList<>();
		}

		AjaxXmlBuilder ajaxXmlBuilder = new AjaxXmlBuilder();

		EgovMap emResult = new EgovMap();
		for (int i = 0; i < reusltList.size(); i++) {
			emResult = reusltList.get(i);
			ajaxXmlBuilder.addItem((String) emResult.get("recentSrchwrdNm"), (String) emResult.get("recentSrchwrdNm"),
					false);
		}

		model.addObject("ajaxXml", ajaxXmlBuilder.toString());

		return model;
	}

	/**
	 * 理쒓렐寃?됱뼱瑜??깅줉?쒕떎.
	 * 
	 * @param commandMap
	 * @param recentSrchwrd
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/rsm/registRecentSrchwrdResult.do")
	public void egovRecentSrchwrdRegist(@RequestParam Map<?, ?> commandMap, HttpServletResponse response,
			RecentSrchwrd recentSrchwrd) throws Exception {

		response.setHeader("Content-Type", "text/html;charset=utf-8");
		Writer writer = new OutputStreamWriter(response.getOutputStream(), "UTF-8"); // NOPMD - CloseResource 洹쒖튃 臾댁떆
		PrintWriter out = new PrintWriter(writer); // NOPMD - CloseResource 洹쒖튃 臾댁떆

		LOGGER.debug("commandMap : {}", commandMap);
		LOGGER.debug("recentSrchwrd : {}", recentSrchwrd);

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		// ?꾩씠???ㅼ젙
		recentSrchwrd.setFrstRegisterId(uniqId);
		recentSrchwrd.setLastUpdusrId(uniqId);

		// System.out.println("recentSrchwrd.getSrchwrdNm() : "+
		// recentSrchwrd.getSrchwrdNm());

		// 寃?됱뼱媛 ?놁쓣 ??誘몄???
		if (recentSrchwrd.getSrchwrdNm() != null && !recentSrchwrd.getSrchwrdNm().equals("")) {
			egovRecentSrchwrdService.insertRecentSrchwrdResult(recentSrchwrd);
		}

		out.print("Success");

		out.flush();
	}

}
