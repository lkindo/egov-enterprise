**
 * 媛쒖슂
 * - 濡쒓렇?몄젙梨낆뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 濡쒓렇?몄젙梨낆뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 濡쒓렇?몄젙梨낆쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:53
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2009.8.3    ?대Ц以     理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *  2024.10.29	LeeBaekHaeng	寃?됱“嫄??좎?
 * </pre>
 */

package egovframework.com.uat.uap.web;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uat.uap.service.EgovLoginPolicyService;
import egovframework.com.uat.uap.service.LoginPolicy;
import egovframework.com.uat.uap.service.LoginPolicyVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovLoginPolicyController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	@Resource(name="egovLoginPolicyService")
	EgovLoginPolicyService egovLoginPolicyService;

	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉 議고쉶?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/selectLoginPolicyListView.do")
	public String selectLoginPolicyListView() throws Exception {
		return "egovframework/com/uat/uap/EgovLoginPolicyList";
	}

	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉??議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name="濡쒓렇?몄젙梨낃?由?, order = 30 ,gid = 10)
	@RequestMapping("/uat/uap/selectLoginPolicyList.do")
	public String selectLoginPolicyList(@ModelAttribute("loginPolicyVO") LoginPolicyVO loginPolicyVO,
			                             ModelMap model) throws Exception {

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
	    paginationInfo.setCurrentPageNo(loginPolicyVO.getPageIndex());
	    paginationInfo.setRecordCountPerPage(loginPolicyVO.getPageUnit());
	    paginationInfo.setPageSize(loginPolicyVO.getPageSize());

	    loginPolicyVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
	    loginPolicyVO.setLastIndex(paginationInfo.getLastRecordIndex());
	    loginPolicyVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	    loginPolicyVO.setLoginPolicyList(egovLoginPolicyService.selectLoginPolicyList(loginPolicyVO));
        model.addAttribute("loginPolicyList", loginPolicyVO.getLoginPolicyList());

        int totCnt = egovLoginPolicyService.selectLoginPolicyListTotCnt(loginPolicyVO);
	    paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uat/uap/EgovLoginPolicyList";
	}

	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/getLoginPolicy.do")
	public String selectLoginPolicy(@RequestParam("emplyrId") String emplyrId,
			                        @ModelAttribute("loginPolicyVO") LoginPolicyVO loginPolicyVO,
                                     ModelMap model) throws Exception {

		loginPolicyVO.setEmplyrId(emplyrId);

		model.addAttribute("loginPolicy", egovLoginPolicyService.selectLoginPolicy(loginPolicyVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		LoginPolicyVO vo = (LoginPolicyVO)model.get("loginPolicy");

		if(vo.getRegYn().equals("N")) {
			return "egovframework/com/uat/uap/EgovLoginPolicyRegist";
		} else {
			return "egovframework/com/uat/uap/EgovLoginPolicyUpdt";
		}
	}

	/**
	 * 濡쒓렇?몄젙梨??뺣낫 ?깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/addLoginPolicyView.do")
	public String insertLoginPolicyView(@RequestParam("emplyrId") String emplyrId,
                                        @ModelAttribute("loginPolicyVO") LoginPolicyVO loginPolicyVO,
                                         ModelMap model) throws Exception {

		loginPolicyVO.setEmplyrId(emplyrId);

		model.addAttribute("loginPolicy", egovLoginPolicyService.selectLoginPolicy(loginPolicyVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uat/uap/EgovLoginPolicyRegist";
	}

	/**
	 * 濡쒓렇?몄젙梨??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/addLoginPolicy.do")
	public String insertLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicy loginPolicy,
			                         BindingResult bindingResult,
                                     ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("loginPolicyVO", loginPolicy);
			return "egovframework/com/uat/uap/EgovLoginPolicyRegist";
		} else {

			LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
			loginPolicy.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

			egovLoginPolicyService.insertLoginPolicy(loginPolicy);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

			model.addAttribute("emplyrId", loginPolicy.getEmplyrId());
			model.addAttribute("searchCondition", loginPolicy.getSearchCondition());
			model.addAttribute("searchKeyword", loginPolicy.getSearchKeyword());
			model.addAttribute("pageIndex", loginPolicy.getPageIndex());

			return "redirect:/uat/uap/getLoginPolicy.do";
		}
	}

	/**
	 * 湲??깅줉??濡쒓렇?몄젙梨??뺣낫瑜??섏젙?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/updtLoginPolicy.do")
	public String updateLoginPolicy(@Valid @ModelAttribute("loginPolicy") LoginPolicy loginPolicy,
			                         BindingResult bindingResult,
                                     ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("loginPolicyVO", loginPolicy);
			return "egovframework/com/uat/uap/EgovLoginPolicyUpdt";
		} else {
			LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
			loginPolicy.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

			egovLoginPolicyService.updateLoginPolicy(loginPolicy);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

			model.addAttribute("searchCondition", loginPolicy.getSearchCondition());
			model.addAttribute("searchKeyword", loginPolicy.getSearchKeyword());
			model.addAttribute("pageIndex", loginPolicy.getPageIndex());

			return "redirect:/uat/uap/selectLoginPolicyList.do";
		}
	}

	/**
	 * 湲??깅줉??濡쒓렇?몄젙梨??뺣낫瑜???젣?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping("/uat/uap/removeLoginPolicy.do")
	public String deleteLoginPolicy(@ModelAttribute("loginPolicy") LoginPolicy loginPolicy,
                                     ModelMap model) throws Exception {

		egovLoginPolicyService.deleteLoginPolicy(loginPolicy);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));

		model.addAttribute("searchCondition", loginPolicy.getSearchCondition());
		model.addAttribute("searchKeyword", loginPolicy.getSearchKeyword());
		model.addAttribute("pageIndex", loginPolicy.getPageIndex());

		return "redirect:/uat/uap/selectLoginPolicyList.do";
	}

}
