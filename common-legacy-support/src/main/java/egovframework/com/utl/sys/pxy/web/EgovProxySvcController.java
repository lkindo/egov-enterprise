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

/**
 * <pre>
 * ??
 * - ?????????????controller ?????? ???.
 *
 * ???
 * - ??????????????, ??, ???? ?????????.
 * - ???????????? ?, ??????.
 * </pre>
 * 
 * @author lee.m.j
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.28  lee.m.j      ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2019.12.05  ???         KISA ?? ??(???? ??)
 *   2025.09.17  ????         2025????????PMD???????? ????????-FieldNamingConventions(?????????
 *   2025.09.17  ????         2025????????PMD???????? ????????-AvoidReassigningParameters(???????parameter ????????????)
 *
 *      </pre>
 **/
@Controller
public class EgovProxySvcController {

	@Resource(name = "egovProxySvcService")
	private EgovProxySvcService egovProxySvcService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** ID Generation **/
	@Resource(name = "egovProxySvcIdGnrService")

	private EgovIdGnrService egovProxySvcIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ??????? ? ???
	 *
	 * @return String
	 **/
	@RequestMapping(value = "/utl/sys/pxy/selectProxySvcListView.do")
	public String selectProxySvcListView() throws Exception {
		return "egovframework/com/utl/sys/pxy/EgovProxySvcList";
	}

	/**
	 * ??????????? ????????????.
	 *
	 * @param proxySvcVO - ???????Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/selectProxySvcList.do")
	public String selectProxySvcList(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model)
			throws Exception {

		/** paging **/
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
	 * ??????????????????.
	 *
	 * @param proxyId    - String
	 * @param proxySvcVO - ???????Vo
	 * @return String - ? Url
	 **/
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
	 * ???????????? ??? ????.
	 *
	 * @param proxySvc - ???????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/addViewProxySvc.do")
	public String insertViewProxySvc(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, ModelMap model)
			throws Exception {

		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM072"));
		model.addAttribute("proxySvc", proxySvcVO);

		return "egovframework/com/utl/sys/pxy/EgovProxySvcRegist";
	}

	/**
	 * ????????????.
	 *
	 * @param proxySvc - ???????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/addProxySvc.do")
	public String insertProxySvc(@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO,
			@ModelAttribute("proxySvc") ProxySvc proxySvc, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("proxySvcVO", proxySvcVO);
			return "egovframework/com/utl/sys/pxy/EgovProxySvcRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA ?????(2018-12-10, ????)

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
	 * ??????????????? ??? ????.
	 *
	 * @param proxyId  - String
	 * @param proxySvc - ???????model
	 * @return String - ? Url
	 **/
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
	 * ???????????????.
	 *
	 * @param proxySvc - ???????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/updtProxySvc.do")
	public String updateProxySvc(@ModelAttribute("proxySvc") ProxySvc proxySvc,
			@ModelAttribute("proxySvcVO") ProxySvcVO proxySvcVO, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("proxySvcVO", proxySvc);
			return "egovframework/com/utl/sys/pxy/EgovProxySvcUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA ?????(2018-12-10, ????)

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
	 * ????????????????.
	 *
	 * @param proxySvc - ???????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/removeProxySvc.do")
	public String deleteProxySvc(@RequestParam("proxyId") String proxyId, @ModelAttribute("proxySvc") ProxySvc proxySvc,
			ModelMap model) throws Exception {

		proxySvc.setProxyId(proxyId);
		egovProxySvcService.deleteProxySvc(proxySvc);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/utl/sys/pxy/selectProxySvcList.do";
	}

	/**
	 * ??????? ? ???
	 *
	 * @return String
	 **/
	@RequestMapping(value = "/utl/sys/pxy/selectProxyLogListView.do")
	public String selectProxyLogListView(@ModelAttribute("pmProxyLogVO") ProxyLogVO proxyLogVO, ModelMap model)
			throws Exception {

		proxyLogVO.setStrStartDate(EgovStringUtil.addMinusChar(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1)));
		proxyLogVO.setStrEndDate(EgovStringUtil.addMinusChar(EgovDateUtil.getToday()));

		model.addAttribute("pmProxyLogVO", proxyLogVO);

		return "egovframework/com/utl/sys/pxy/EgovProxyLogList";
	}

	/**
	 * ??????????? ? ????????????.
	 *
	 * @param proxyLogVO - ????Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/pxy/selectProxyLogList.do")
	public String selectProxyLogList(@ModelAttribute("proxyLogVO") ProxyLogVO proxyLogVO,
			@ModelAttribute("pmProxyLogVO") ProxyLogVO pmProxyLogVO, ModelMap model) throws Exception {
		/** paging **/
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
	 * ?? ?
	 *
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 **/
	public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)
			throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}
}
