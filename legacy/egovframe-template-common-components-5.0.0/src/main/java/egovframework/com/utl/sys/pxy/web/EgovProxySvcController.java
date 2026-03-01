package egovframework.com.utl.sys.pxy.web;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.pxy.service.EgovProxySvcService;
import egovframework.com.utl.sys.pxy.service.ProxyLogVO;
import egovframework.com.utl.sys.pxy.service.ProxySvc;
import egovframework.com.utl.sys.pxy.service.ProxySvcVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author lee.m.j
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  lee.m.j      理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.05  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (寃쎈줈議곗옉諛??먯썝 ?쎌엯)
 *   2025.09.17  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *   2025.09.17  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovProxySvcController {

	@Resource(name = "egovProxySvcService")
	private EgovProxySvcService egovProxySvcService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** ID Generation */
	@Resource(name = "egovProxySvcIdGnrService")

	private EgovIdGnrService egovProxySvcIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪?뺣낫 紐⑸줉?붾㈃ ?대룞
	 *
	 * @return String
	 */
	@RequestMapping(value = "/utl/sys/pxy/selectProxySvcListView.do")
	public String selectProxySvcListView() throws Exception {
		return "egovframework/com/utl/sys/pxy/EgovProxySvcList";
	}

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪瑜?愿由ы븯湲??꾪빐 ?깅줉???꾨줉?쒖젙蹂?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?꾨줉?쒖꽌鍮꾩뒪", order = 2140, gid = 90)
	@RequestMapping(value = "/utl/sys/pxy/selectProxySvcList.do")
	public String selectProxySvcList(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model)
			throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(proxySvcVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(proxySvcVO.getPageUnit());
		paginationInfo.setPageSize(proxySvcVO.getPageSize());

		proxySvcVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		proxySvcVO.setLastIndex(paginationInfo.getLastRecordIndex());
		proxySvcVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		model.addAttribute("proxySvcList", egovProxySvcService.selectProxySvcList(proxySvcVO));

		int totCnt = egovProxySvcService.selectProxySvcListTotCnt(proxySvcVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/utl/sys/pxy/EgovProxySvcList";
	}

	/**
	 * ?깅줉???꾨줉?쒖꽌鍮꾩뒪???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param proxyId    - String
	 * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/getProxySvc.do")
	public String selectProxySvc(@RequestParam("proxyId") String proxyId,
			@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model) throws Exception {

		proxySvcVO.setProxyId(proxyId);
		ProxySvcVO proxySvc = egovProxySvcService.selectProxySvc(proxySvcVO);
		model.addAttribute("proxySvc", proxySvc);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/utl/sys/pxy/EgovProxySvcDetail";
	}

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪瑜??좉퇋濡??깅줉?섎뒗 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/addViewProxySvc.do")
	public String insertViewProxySvc(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model)
			throws Exception {

		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM072"));
		model.addAttribute("proxySvc", proxySvcVO);

		return "egovframework/com/utl/sys/pxy/EgovProxySvcRegist";
	}

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/addProxySvc.do")
	public String insertProxySvc(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO,
			@ModelAttribute("proxySvc") ProxySvc proxySvc, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("proxySvcVO", proxySvcVO);
			return "egovframework/com/utl/sys/pxy/EgovProxySvcRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			proxySvc.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			proxySvc.setProxyId(egovProxySvcIdGnrService.getNextStringId());

			proxySvc.setProxyIp(EgovWebUtil.filePathBlackList(proxySvc.getProxyIp()));
			proxySvc.setSvcIp(EgovWebUtil.filePathBlackList(proxySvc.getSvcIp()));
			model.addAttribute("proxySvc", egovProxySvcService.insertProxySvc(proxySvcVO, proxySvc));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/utl/sys/pxy/EgovProxySvcDetail";
		}
	}

	/**
	 * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜??섏젙?섎뒗 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param proxyId  - String
	 * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/updtViewProxySvc.do")
	public String updateViewProxySvc(@RequestParam("proxyId") String proxyId,
			@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model) throws Exception {

		proxySvcVO.setProxyId(proxyId);
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM072"));
		model.addAttribute("proxySvc", egovProxySvcService.selectProxySvc(proxySvcVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/utl/sys/pxy/EgovProxySvcUpdt";
	}

	/**
	 * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜??섏젙?쒕떎.
	 *
	 * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/updtProxySvc.do")
	public String updateProxySvc(@ModelAttribute("proxySvc") ProxySvc proxySvc,
			@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("proxySvcVO", proxySvc);
			return "egovframework/com/utl/sys/pxy/EgovProxySvcUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			proxySvc.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

			proxySvc.setProxyIp(EgovWebUtil.filePathBlackList(proxySvc.getProxyIp()));
			proxySvc.setSvcIp(EgovWebUtil.filePathBlackList(proxySvc.getSvcIp()));
			egovProxySvcService.updateProxySvc(proxySvcVO, proxySvc);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/utl/sys/pxy/getProxySvc.do";
		}
	}

	/**
	 * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜???젣?쒕떎.
	 *
	 * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/removeProxySvc.do")
	public String deleteProxySvc(@RequestParam("proxyId") String proxyId, @ModelAttribute("proxySvc") ProxySvc proxySvc,
			ModelMap model) throws Exception {

		proxySvc.setProxyId(proxyId);
		egovProxySvcService.deleteProxySvc(proxySvc);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/utl/sys/pxy/selectProxySvcList.do";
	}

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪?뺣낫 紐⑸줉?붾㈃ ?대룞
	 *
	 * @return String
	 */
	@RequestMapping(value = "/utl/sys/pxy/selectProxyLogListView.do")
	public String selectProxyLogListView(@ModelAttribute("pmProxyLogVO") ProxyLogVO proxyLogVO, ModelMap model)
			throws Exception {

		proxyLogVO.setStrStartDate(EgovStringUtil.addMinusChar(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1)));
		proxyLogVO.setStrEndDate(EgovStringUtil.addMinusChar(EgovDateUtil.getToday()));

		model.addAttribute("pmProxyLogVO", proxyLogVO);

		return "egovframework/com/utl/sys/pxy/EgovProxyLogList";
	}

	/**
	 * ?꾨줉?쒖꽌鍮꾩뒪瑜?紐⑤땲?곕쭅?섍린 ?꾪빐 ?깅줉???꾨줉?쒕줈洹?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/pxy/selectProxyLogList.do")
	public String selectProxyLogList(@ModelAttribute("proxyLogVO") ProxyLogVO proxyLogVO,
			@ModelAttribute("pmProxyLogVO") ProxyLogVO pmProxyLogVO, ModelMap model) throws Exception {
		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(proxyLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(proxyLogVO.getPageUnit());
		paginationInfo.setPageSize(proxyLogVO.getPageSize());

		proxyLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		proxyLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		proxyLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (proxyLogVO.getStrStartDate() == null || proxyLogVO.getStrEndDate() == null) {
			proxyLogVO.setStrStartDate(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));
			proxyLogVO.setStrEndDate(EgovDateUtil.getToday());
		} else {
			proxyLogVO.setStrStartDate(EgovStringUtil.removeMinusChar(proxyLogVO.getStrStartDate()));
			proxyLogVO.setStrEndDate(EgovStringUtil.removeMinusChar(proxyLogVO.getStrEndDate()));
		}

		model.addAttribute("proxyLogList", egovProxySvcService.selectProxyLogList(proxyLogVO));

		int totCnt = egovProxySvcService.selectProxyLogListTotCnt(proxyLogVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		pmProxyLogVO.setStrStartDate(EgovStringUtil.addMinusChar(proxyLogVO.getStrStartDate()));
		pmProxyLogVO.setStrEndDate(EgovStringUtil.addMinusChar(proxyLogVO.getStrEndDate()));
		model.addAttribute("pmProxyLogVO", pmProxyLogVO);

		return "egovframework/com/utl/sys/pxy/EgovProxyLogList";
	}

	/**
	 * 怨듯넻肄붾뱶 ?몄텧
	 *
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 */
	public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)
			throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}
}
