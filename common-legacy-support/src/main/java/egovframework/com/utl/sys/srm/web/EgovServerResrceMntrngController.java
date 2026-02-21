package egovframework.com.utl.sys.srm.web;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.srm.service.EgovServerResrceMntrngService;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrngVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * ??
 * - ????????????controller ?????? ???.
 * 
 * ???
 * - ?????????????, ?????????.
 * </pre>
 * 
 * @author lee.m.j
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.09.06  lee.m.j      ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.09.18  ????         2025????????PMD???????? ????????-AvoidReassigningParameters(???????parameter ????????????)
 *
 *      </pre>
 **/
@Controller
public class EgovServerResrceMntrngController {

	@Resource(name = "egovServerResrceMntrngService")
	private EgovServerResrceMntrngService egovServerResrceMntrngService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?????????????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/srm/selectMntrngServerList.do")
	public String selectMntrngServerList(
			@ModelAttribute("serverResrceMntrngVO") ServerResrceMntrngVO serverResrceMntrngVO, ModelMap model)
			throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(serverResrceMntrngVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(serverResrceMntrngVO.getPageUnit());
		paginationInfo.setPageSize(serverResrceMntrngVO.getPageSize());

		serverResrceMntrngVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		serverResrceMntrngVO.setLastIndex(paginationInfo.getLastRecordIndex());
		serverResrceMntrngVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		model.addAttribute("mntrngServerList",
				egovServerResrceMntrngService.selectMntrngServerList(serverResrceMntrngVO));

		int totCnt = egovServerResrceMntrngService.selectMntrngServerListTotCnt(serverResrceMntrngVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/utl/sys/srm/EgovMntrngServerList";
	}

	/**
	 * ?????????? ? ???
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/srm/selectServerResrceMntrngListView.do")
	public String selectServerResrceMntrngListView(
			@ModelAttribute("pmServerResrceMntrng") ServerResrceMntrngVO pmServerResrceMntrng, ModelMap model)
			throws Exception {

		pmServerResrceMntrng
				.setStrStartDt(EgovStringUtil.addMinusChar(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1)));
		pmServerResrceMntrng.setStrEndDt(EgovStringUtil.addMinusChar(EgovDateUtil.getToday()));
		model.addAttribute("pmServerResrceMntrng", pmServerResrceMntrng);

		return "egovframework/com/utl/sys/srm/EgovServerResrceMntrngList";
	}

	/**
	 * ?????????? ?????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/srm/selectServerResrceMntrngList.do")
	public String selectServerResrceMntrngList(
			@ModelAttribute("serverResrceMntrngVO") ServerResrceMntrngVO serverResrceMntrngVO,
			@ModelAttribute("pmServerResrceMntrng") ServerResrceMntrngVO pmServerResrceMntrng, ModelMap model)
			throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(serverResrceMntrngVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(serverResrceMntrngVO.getPageUnit());
		paginationInfo.setPageSize(serverResrceMntrngVO.getPageSize());

		serverResrceMntrngVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		serverResrceMntrngVO.setLastIndex(paginationInfo.getLastRecordIndex());
		serverResrceMntrngVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (serverResrceMntrngVO.getStrStartDt() == null || serverResrceMntrngVO.getStrEndDt() == null) {
			serverResrceMntrngVO.setStrStartDt(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));
			serverResrceMntrngVO.setStrEndDt(EgovDateUtil.getToday());
		} else {
			serverResrceMntrngVO.setStrStartDt(EgovStringUtil.removeMinusChar(serverResrceMntrngVO.getStrStartDt()));
			serverResrceMntrngVO.setStrEndDt(EgovStringUtil.removeMinusChar(serverResrceMntrngVO.getStrEndDt()));
		}

		model.addAttribute("serverResrceMntrngList",
				egovServerResrceMntrngService.selectServerResrceMntrngList(serverResrceMntrngVO));

		int totCnt = egovServerResrceMntrngService.selectServerResrceMntrngListTotCnt(serverResrceMntrngVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		pmServerResrceMntrng.setStrStartDt(EgovStringUtil.addMinusChar(serverResrceMntrngVO.getStrStartDt()));
		pmServerResrceMntrng.setStrEndDt(EgovStringUtil.addMinusChar(serverResrceMntrngVO.getStrEndDt()));
		model.addAttribute("pmServerResrceMntrng", pmServerResrceMntrng);

		return "egovframework/com/utl/sys/srm/EgovServerResrceMntrngList";
	}

	/**
	 * ?????? ??????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/srm/getServerResrceMntrng.do")
	public String selectServerResrceMntrng(@RequestParam("logId") String logId,
			@RequestParam("strStartDt") String strStartDt, @RequestParam("strEndDt") String strEndDt,
			@ModelAttribute("serverResrceMntrngVO") ServerResrceMntrngVO serverResrceMntrngVO,
			@ModelAttribute("pmServerResrceMntrng") ServerResrceMntrngVO pmServerResrceMntrng, ModelMap model)
			throws Exception {
		serverResrceMntrngVO.setLogId(logId);
		ServerResrceMntrngVO serverResrceMntrng = egovServerResrceMntrngService
				.selectServerResrceMntrng(serverResrceMntrngVO);

		pmServerResrceMntrng.setStrStartDt(strStartDt);
		pmServerResrceMntrng.setStrEndDt(strEndDt);

		model.addAttribute("serverResrceMntrng", serverResrceMntrng);
		model.addAttribute("pmServerResrceMntrng", pmServerResrceMntrng);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/utl/sys/srm/EgovServerResrceMntrngDetail";
	}

}
