package egovframework.com.uss.sam.ipm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import egovframework.com.uss.sam.ipm.service.EgovIndvdlInfoPolicyService;
import egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜?泥섎━?섎뒗 Controller Class 援ы쁽
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
 *   2024.10.29  沅뚰깭??         ?깅줉 /?섏젙 ?붾㈃怨?泥섎━ 濡쒖쭅 遺꾨━
 *   2025.08.27  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovIndvdlInfoPolicyController {

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "egovIndvdlInfoPolicyService")
	private EgovIndvdlInfoPolicyService egovIndvdlInfoPolicyService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param indvdlInfoPolicy
	 * @param model
	 * @return "egovframework/com/uss/sam/ipm/EgovOnlinePollList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "媛쒖씤?뺣낫蹂댄샇?뺤콉?뺤씤", order = 510, gid = 50)
	@RequestMapping(value = "/uss/sam/ipm/listIndvdlInfoPolicy.do")
	public String egovIndvdlInfoPolicyList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, IndvdlInfoPolicy indvdlInfoPolicy, ModelMap model) throws Exception {

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

		List<EgovMap> resultList = egovIndvdlInfoPolicyService.selectIndvdlInfoPolicyList(searchVO);
		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovIndvdlInfoPolicyService.selectIndvdlInfoPolicyListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyList";
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param indvdlInfoPolicy
	 * @param commandMap
	 * @param model
	 * @return "/uss/sam/ipm/EgovOnlinePollDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/ipm/detailIndvdlInfoPolicy.do")
	public String egovIndvdlInfoPolicyDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			IndvdlInfoPolicy indvdlInfoPolicy, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovIndvdlInfoPolicyService.deleteIndvdlInfoPolicy(indvdlInfoPolicy);
			sLocationUrl = "forward:/uss/sam/ipm/listIndvdlInfoPolicy.do";
		} else {
			IndvdlInfoPolicy indvdlInfoPolicyVO = egovIndvdlInfoPolicyService
					.selectIndvdlInfoPolicyDetail(indvdlInfoPolicy);
			model.addAttribute("indvdlInfoPolicy", indvdlInfoPolicyVO);
		}

		return sLocationUrl;
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?섏젙?붾㈃
	 * 
	 * @param searchVO
	 * @param indvdlInfoPolicy
	 * @param model
	 * @return "/uss/sam/ipm/EgovOnlinePollUpdt"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/ipm/updtIndvdlInfoPolicyView.do")
	public String egovIndvdlInfoPolicyModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("indvdlInfoPolicy") IndvdlInfoPolicy indvdlInfoPolicy, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		IndvdlInfoPolicy indvdlInfoPolicyVO = egovIndvdlInfoPolicyService
				.selectIndvdlInfoPolicyDetail(indvdlInfoPolicy);
		model.addAttribute("indvdlInfoPolicy", indvdlInfoPolicyVO);

		return "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyUpdt";
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param indvdlInfoPolicy
	 * @param bindingResult
	 * @param model
	 * @return "redirect:/uss/sam/ipm/listIndvdlInfoPolicy.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/ipm/updtIndvdlInfoPolicy.do")
	public String egovIndvdlInfoPolicyModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("indvdlInfoPolicy") IndvdlInfoPolicy indvdlInfoPolicy,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyUpdt";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		// ?꾩씠???ㅼ젙
		indvdlInfoPolicy.setFrstRegisterId(uniqId);
		indvdlInfoPolicy.setLastUpdusrId(uniqId);

		egovIndvdlInfoPolicyService.updateIndvdlInfoPolicy(indvdlInfoPolicy);

		return "redirect:/uss/sam/ipm/listIndvdlInfoPolicy.do";
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?깅줉?붾㈃
	 * 
	 * @param searchVO
	 * @param indvdlInfoPolicy
	 * @param model
	 * @return "/uss/sam/ipm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/ipm/registIndvdlInfoPolicyView.do")
	public String egovIndvdlInfoPolicyRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("indvdlInfoPolicy") IndvdlInfoPolicy indvdlInfoPolicy, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyRegist";
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param indvdlInfoPolicy
	 * @param bindingResult
	 * @param model
	 * @return "/uss/sam/ipm/EgovOnlinePollRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/ipm/registIndvdlInfoPolicy.do")
	public String egovIndvdlInfoPolicyRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, @ModelAttribute("indvdlInfoPolicy") IndvdlInfoPolicy indvdlInfoPolicy,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyRegist";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String uniqId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		// ?꾩씠???ㅼ젙
		indvdlInfoPolicy.setFrstRegisterId(uniqId);
		indvdlInfoPolicy.setLastUpdusrId(uniqId);

		// ???
		egovIndvdlInfoPolicyService.insertIndvdlInfoPolicy(indvdlInfoPolicy);

		return "forward:/uss/sam/ipm/listIndvdlInfoPolicy.do";
	}

}