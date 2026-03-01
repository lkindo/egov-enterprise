package egovframework.com.utl.sys.srm.web;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.srm.service.EgovServerResrceMntrngService;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrngVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * </pre>
 * 
 * @author lee.m.j
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.09.06  lee.m.j      理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.09.18  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovServerResrceMntrngController {

	@Resource(name = "egovServerResrceMntrngService")
	private EgovServerResrceMntrngService egovServerResrceMntrngService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅????곸젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?쒕쾭?먯썝紐⑤땲?곕쭅-??곷ぉ濡?, order = 2170, gid = 90)
	@RequestMapping(value = "/utl/sys/srm/selectMntrngServerList.do")
	public String selectMntrngServerList(
			@ModelAttribute("serverResrceMntrngVO") ServerResrceMntrngVO serverResrceMntrngVO, ModelMap model)
			throws Exception {

		/** paging */
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
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉?붾㈃ ?대룞
	 * 
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return String - 由ы꽩 Url
	 */
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
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/srm/selectServerResrceMntrngList.do")
	public String selectServerResrceMntrngList(
			@ModelAttribute("serverResrceMntrngVO") ServerResrceMntrngVO serverResrceMntrngVO,
			@ModelAttribute("pmServerResrceMntrng") ServerResrceMntrngVO pmServerResrceMntrng, ModelMap model)
			throws Exception {

		/** paging */
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
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return String - 由ы꽩 Url
	 */
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
