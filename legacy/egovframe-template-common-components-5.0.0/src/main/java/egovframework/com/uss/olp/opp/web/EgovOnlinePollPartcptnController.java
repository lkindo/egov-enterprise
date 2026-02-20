package egovframework.com.uss.olp.opp.web;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.opp.service.EgovOnlinePollPartcptnService;
import egovframework.com.uss.olp.opp.service.OnlinePollPartcptn;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ?⑤씪?퇠OLL李몄뿬瑜?泥섎━?섎뒗 Controller Class 援ы쁽
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
 *   2011.08.26	 ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.10.27  ?쒖???         ?⑤씪??POLL 以묐났 ?ы몴 諛⑹? 湲곕뒫 異붽?
 *   2024.10.29  沅뚰깭??         ?붾㈃?먯꽌 ?ъ슜???꾩옱?쇱옄 ?뺣낫 model??異붽?(egovOnlinePollPartcptnList())
 *   2025.08.23  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovOnlinePollPartcptnController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovOnlinePollPartcptnController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "egovOnlinePollPartcptnService")
	private EgovOnlinePollPartcptnService egovOnlinePollPartcptnService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** Egov Common Code Service */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?⑤씪?퇠OLL李몄뿬 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollPartcptn
	 * @param model
	 * @return "egovframework/com/uss/olp/opp/EgovOnlinePollList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opp/listEgovOnlinePollPartcptnMain.do")
	public String egovOnlinePollPartcptnMainList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollPartcptn onlinePollPartcptn, ModelMap model)
			throws Exception {

//        String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

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

		List<EgovMap> reusltList = egovOnlinePollPartcptnService.selectOnlinePollManageList(searchVO);
		model.addAttribute("resultList", reusltList);

		return "egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnMainList";
	}

	/**
	 * ?⑤씪?퇠OLL李몄뿬 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollPartcptn
	 * @param model
	 * @return "egovframework/com/uss/olp/opp/EgovOnlinePollList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?⑤씪?퇼oll李몄뿬", order = 661, gid = 50)
	@RequestMapping(value = "/uss/olp/opp/listOnlinePollPartcptn.do")
	public String egovOnlinePollPartcptnList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, OnlinePollPartcptn onlinePollPartcptn, ModelMap model)
			throws Exception {

//        String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

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

		List<EgovMap> reusltList = egovOnlinePollPartcptnService.selectOnlinePollManageList(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovOnlinePollPartcptnService.selectOnlinePollManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("now", LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")));

		return "egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnList";
	}

	/**
	 * ?⑤씪?퇠OLL李몄뿬瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param onlinePollPartcptn
	 * @param bindingResult
	 * @param model
	 * @return "/uss/olp/opp/EgovOnlinePollPartcptnRegist"
	 * @throws Exception
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/olp/opp/registOnlinePollPartcptn.do")
	public String egovOnlinePollPartcptnRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("onlinePollPartcptn") OnlinePollPartcptn onlinePollPartcptn, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {
			// ?꾩씠???ㅼ젙
			onlinePollPartcptn
					.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			onlinePollPartcptn
					.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			// ?ы몴?щ? 泥댄겕
			if (egovOnlinePollPartcptnService.selectOnlinePollResult(onlinePollPartcptn) != 0) {
				String reusltScript = "";

				reusltScript += "<script type='text/javaScript' language='javascript'>";
				reusltScript += "alert('???⑤씪?퇠OLL???쒕쾲留??ы몴 媛?ν빀?덈떎. ');";
				reusltScript += "</script>";

				model.addAttribute("reusltScript", reusltScript);
				return "forward:/uss/olp/opp/listOnlinePollPartcptn.do";
			}

			egovOnlinePollPartcptnService.insertOnlinePollResult(onlinePollPartcptn);

			String reusltScript = "";

			reusltScript += "<script type='text/javaScript' language='javascript'>";
			reusltScript += "alert(' ?⑤씪?퇠OLL李몄뿬???묓빐二쇱뀛??媛먯궗?⑸땲??  ');";
			reusltScript += "</script>";

			model.addAttribute("reusltScript", reusltScript);
			sLocationUrl = "forward:/uss/olp/opp/listOnlinePollPartcptn.do";
		} else {
			// POLL醫낅쪟 ?ㅼ젙
			ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM039");
			List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
			model.addAttribute("pollKindCodeList", listComCode);

			// POLL?섍린?좊Т ?ㅼ젙 /POLL?먮룞?섍린?좊Т
			List<Object> listPollDeuseYn = new ArrayList<Object>();
			voComCode = new ComDefaultCodeVO();
			voComCode.setCodeId("COM038");
			model.addAttribute("pollDeuseYnList", cmmUseService.selectCmmCodeDetail(voComCode));

			// ?⑤씪?퇠OLL愿由??뺣낫 ?ㅼ젙
			List<EgovMap> reusltPollManage = egovOnlinePollPartcptnService
					.selectOnlinePollManageDetail(onlinePollPartcptn);
			model.addAttribute("PollManage", reusltPollManage);
			// ?⑤씪?퇠OLL??ぉ ?뺣낫 ?ㅼ젙
			List<EgovMap> reusltPollItem = egovOnlinePollPartcptnService.selectOnlinePollItemDetail(onlinePollPartcptn);
			model.addAttribute("PollItem", reusltPollItem);
		}

		return sLocationUrl;
	}

	/**
	 * ?⑤씪?퇠OLL愿由??듦퀎瑜?議고쉶?쒕떎.
	 * 
	 * @param onlinePollPartcptn
	 * @param model
	 * @return "/uss/olp/opm/EgovOnlinePollManageStatistics"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/opp/statisticsOnlinePollPartcptn.do")
	public String egovOnlinePollManageStatistics(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("onlinePollPartcptn") OnlinePollPartcptn onlinePollPartcptn, HttpServletRequest request,
			ModelMap model) throws Exception {

		// POLL醫낅쪟 ?ㅼ젙
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM039");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("pollKindCodeList", listComCode);

		// POLL?섍린?좊Т ?ㅼ젙 /POLL?먮룞?섍린?좊Т
//        List<?> listPollDeuseYn = new ArrayList<Object>();
		voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM038");
		model.addAttribute("pollDeuseYnList", cmmUseService.selectCmmCodeDetail(voComCode));

		// ?⑤씪?퇠OLL愿由??뺣낫 ?ㅼ젙
		List<EgovMap> reusltPollManageList = egovOnlinePollPartcptnService
				.selectOnlinePollManageDetail(onlinePollPartcptn);
		model.addAttribute("PollManageList", reusltPollManageList);
		// ?⑤씪?퇠OLL??ぉ ?뺣낫 ?ㅼ젙
		List<EgovMap> reusltPollItemList = egovOnlinePollPartcptnService.selectOnlinePollItemDetail(onlinePollPartcptn);
		model.addAttribute("PollItemList", reusltPollItemList);
		// ?⑤씪?퇠OLL寃곌낵 ?뺣낫 ?ㅼ젙
		List<EgovMap> reusltList = egovOnlinePollPartcptnService.selectOnlinePollManageStatistics(onlinePollPartcptn);
		model.addAttribute("statisticsList", reusltList);

		// ?댁쟾 二쇱냼
		model.addAttribute("returnUrl", request.getHeader("REFERER"));

		model.addAttribute("linkType", commandMap.get("linkType") == null ? "" : (String) commandMap.get("linkType"));

		return "egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnStatistics";
	}

}
