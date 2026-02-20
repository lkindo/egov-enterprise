package egovframework.com.uss.olh.omm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cmm.util.EgovXssChecker;
import egovframework.com.uss.olh.omm.service.EgovOnlineManualService;
import egovframework.com.uss.olh.omm.service.OnlineManualVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * ?⑤씪?몃찓?댁뼹瑜?泥섎━?섎뒗 Controller Class 援ы쁽
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
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2016.08.12  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2025.08.21  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovOnlineManualController {
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovOnlineManualController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "EgovOnlineManualService")
	private EgovOnlineManualService egovOnlineManualService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** Egov Common Code Service */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?ъ슜???⑤씪?몃찓?댁뼹 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManual
	 * @param model
	 * @return "egovframework/com/uss/olh/omn/EgovOnlineManualList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?ъ슜?먯삩?쇱씤留ㅻ돱??, order = 571, gid = 50)
	@RequestMapping(value = "/uss/olh/omn/selectOnlineManualList.do")
	public String selectOnlineManualUserList(@ModelAttribute("searchVO") OnlineManualVO searchVO, ModelMap model)
			throws Exception {

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

		List<OnlineManualVO> resultList = egovOnlineManualService.selectOnlineManualList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovOnlineManualService.selectOnlineManualListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/omm/EgovOnlineManualUserList";
	}

	/**
	 * ?ъ슜?먯삩?쇱씤硫붾돱???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManualVO
	 * @param model
	 * @return "/uss/olh/omn/EgovOnlineManualUserDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olh/omn/selectOnlineManualDetail.do")
	public String selectOnlineManualUserDetail(@ModelAttribute("searchVO") OnlineManualVO searchVO,
			OnlineManualVO onlineManualVO, ModelMap model) throws Exception {

		OnlineManualVO result = egovOnlineManualService.selectOnlineManualDetail(onlineManualVO);
		model.addAttribute("result", result);

		return "egovframework/com/uss/olh/omm/EgovOnlineManualUserDetail";
	}

	/**
	 * ?⑤씪?몃찓?댁뼹 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManual
	 * @param model
	 * @return "egovframework/com/uss/olh/omm/EgovOnlineManualList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?⑤씪?몃ℓ?댁뼹", order = 570, gid = 50)
	@RequestMapping(value = "/uss/olh/omm/selectOnlineManualList.do")
	public String selectOnlineManualList(@ModelAttribute("searchVO") OnlineManualVO searchVO, ModelMap model)
			throws Exception {

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

		List<OnlineManualVO> resultList = egovOnlineManualService.selectOnlineManualList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovOnlineManualService.selectOnlineManualListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/omm/EgovOnlineManualList";
	}

	/**
	 * ?⑤씪?몃찓?댁뼹 ?곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManualVO
	 * @param model
	 * @return "/uss/olh/omm/EgovOnlineManualDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olh/omm/selectOnlineManualDetail.do")
	public String selectOnlineManualDetail(@ModelAttribute("searchVO") OnlineManualVO searchVO,
			OnlineManualVO onlineManualVO, ModelMap model) throws Exception {

		OnlineManualVO result = egovOnlineManualService.selectOnlineManualDetail(onlineManualVO);
		model.addAttribute("result", result);

		return "egovframework/com/uss/olh/omm/EgovOnlineManualDetail";
	}

	/**
	 * ?⑤씪?몃찓?댁뼹???깅줉?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/omm/EgovOnlineManualRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/omm/insertOnlineManualView.do")
	public String insertOnlineManualView(@ModelAttribute("searchVO") OnlineManualVO searchVO, Model model)
			throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM041");

		List<CmmnDetailCode> onlineMnlSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("onlineMnlSeCode", onlineMnlSeCode);

		model.addAttribute("onlineManualVO", new OnlineManualVO());

		return "egovframework/com/uss/olh/omm/EgovOnlineManualRegist";

	}

	/**
	 * ?⑤씪?몃찓?댁뼹???깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManualVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/awm/selectAdministrationWordManageList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/omm/insertOnlineManual.do")
	public String insertOnlineManual(@ModelAttribute("searchVO") OnlineManualVO searchVO,
			@ModelAttribute("onlineManualVO") OnlineManualVO onlineManualVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/omm/EgovOnlineManualRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		onlineManualVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		onlineManualVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovOnlineManualService.insertOnlineManual(onlineManualVO);

		return "forward:/uss/olh/omm/selectOnlineManualList.do";
	}

	/**
	 * ?⑤씪?몃찓?댁뼹???섏젙?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param onlineMnlId
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/omm/EgovOnlineManualUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/omm/updateOnlineManualView.do")
	public String updateOnlineManualView(@RequestParam("onlineMnlId") String onlineMnlId,
			@ModelAttribute("searchVO") OnlineManualVO searchVO, ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM041");

		List<CmmnDetailCode> onlineMnlSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("onlineMnlSeCode", onlineMnlSeCode);

		OnlineManualVO onlineManualVO = new OnlineManualVO();
		onlineManualVO.setOnlineMnlId(onlineMnlId);

		model.addAttribute("onlineManualVO", egovOnlineManualService.selectOnlineManualDetail(onlineManualVO));

		return "egovframework/com/uss/olh/omm/EgovOnlineManualUpdt";
	}

	/**
	 * ?⑤씪?몃찓?댁뼹???섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param onlineManualVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/omm/selectOnlineManualList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/omm/updateOnlineManual.do")
	public String updateOnlineManual(HttpServletRequest request, @ModelAttribute("searchVO") OnlineManualVO searchVO,
			@ModelAttribute("onlineManualVO") OnlineManualVO onlineManualVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/omm/EgovOnlineManualUpdt";
		}

		// --------------------------------------------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");

		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		OnlineManualVO vo = egovOnlineManualService.selectOnlineManualDetail(onlineManualVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??END
		// --------------------------------------------------------------------------------------------

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		onlineManualVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D
		egovOnlineManualService.updateOnlineManual(onlineManualVO);

		return "forward:/uss/olh/omm/selectOnlineManualList.do";

	}

	/**
	 * ?⑤씪?몃찓?댁뼹????젣?쒕떎.
	 * 
	 * @param onlineManualVO
	 * @param searchVO
	 * @return "forward:/uss/olh/omm/selectOnlineManualList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/omm/deleteOnlineManual.do")
	public String deleteOnlineManual(HttpServletRequest request, OnlineManualVO onlineManualVO,
			@ModelAttribute("searchVO") OnlineManualVO searchVO) throws Exception {

		// --------------------------------------------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??START
		// param1 : ?ъ슜?먭퀬?쟅D(uniqId,esntlId)
		// --------------------------------------------------------
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 START ----------------------------------------------");

		// step1 DB?먯꽌 ?대떦 寃뚯떆臾쇱쓽 uniqId 議고쉶
		OnlineManualVO vo = egovOnlineManualService.selectOnlineManualDetail(onlineManualVO);

		// step2 EgovXssChecker 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		EgovXssChecker.checkerUserXss(request, vo.getFrstRegisterId());
		LOGGER.debug("@ XSS 沅뚰븳泥댄겕 END ------------------------------------------------");
		// --------------------------------------------------------
		// @ XSS ?ъ슜?먭텒?쒖껜??END
		// --------------------------------------------------------------------------------------------

		egovOnlineManualService.deleteOnlineManual(onlineManualVO);

		return "forward:/uss/olh/omm/selectOnlineManualList.do";
	}
}
